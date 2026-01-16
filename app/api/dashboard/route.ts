import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import SalesTransaction from "@/lib/models/SalesTransaction";
import Notification from "@/lib/models/Notification";
import CostExpense from "@/lib/models/CostExpense";
import CostOperation from "@/lib/models/CostOperation";
import {
  AggregationPipelines,
  QueryOptimizations,
} from "@/lib/utils/database-optimization";
import { withCache, CacheConfigs } from "@/lib/utils/api-cache";
import { checkAndCreateLowStockNotifications } from "@/lib/utils/notifications";

// Optimized dashboard data fetcher
async function getDashboardData() {
  await connectDB();

  // Trigger low stock check in the background (don't await to avoid slowing down dashboard)
  checkAndCreateLowStockNotifications().catch((error) => {
    console.error("Background low stock check failed:", error);
  });

  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Use Promise.all for parallel execution
  const [
    lowStockProducts,
    dailySales,
    weeklySales,
    recentTransactions,
    unreadNotifications,
    totalProducts,
    monthlyCostExpenses,
    monthlyCostOperations,
  ] = await Promise.all([
    // Low stock products using aggregation pipeline
    Product.aggregate(AggregationPipelines.lowStockProducts()).exec(),

    // Today's sales
    SalesTransaction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          transactionCount: { $sum: 1 },
        },
      },
    ]).exec(),

    // Weekly sales
    SalesTransaction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfWeek,
            $lt: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          transactionCount: { $sum: 1 },
        },
      },
    ]).exec(),

    // Recent transactions with minimal projection
    SalesTransaction.find(
      QueryOptimizations.dateRange(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      )
    )
      .populate("items.productId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec(),

    // Unread notifications count (for system user)
    Notification.countDocuments({ read: false, userId: "system" }).exec(),

    // Total products count
    Product.countDocuments().exec(),

    // Monthly cost expenses summary
    CostExpense.aggregate([
      {
        $match: {
          recordedAt: {
            $gte: new Date(today.getFullYear(), today.getMonth(), 1),
            $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]).exec(),

    // Monthly cost operations (manual costs)
    CostOperation.aggregate([
      {
        $match: {
          date: {
            $gte: new Date(today.getFullYear(), today.getMonth(), 1),
            $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
        },
      },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]).exec(),
  ]);

  // Map CostOperation categories to expense categories
  // salary, utilities, maintenance -> operational
  // rent, other -> overhead
  const costOperationTotals = (monthlyCostOperations || []).reduce(
    (acc: any, operation: any) => {
      const amount = operation.totalAmount || 0;
      const category = operation._id; // This is the category from aggregation

      if (
        category === "salary" ||
        category === "utilities" ||
        category === "maintenance"
      ) {
        acc.operational += amount;
      } else {
        // rent, other, and any unknown categories go to overhead
        acc.overhead += amount;
      }
      acc.total += amount;
      return acc;
    },
    { total: 0, operational: 0, overhead: 0 }
  );

  // Calculate cost expenses totals (from CostExpense records)
  const costExpensesTotals = (monthlyCostExpenses || []).reduce(
    (acc: any, expense: any) => {
      const category = expense._id; // This is the category from the aggregation
      const amount = expense.totalAmount || 0;

      // Map the category to the correct expense type
      if (category === "inventory") {
        acc.inventory += amount;
      } else if (category === "operational") {
        acc.operational += amount;
      } else if (category === "overhead") {
        acc.overhead += amount;
      }

      acc.total += amount;
      return acc;
    },
    { total: 0, inventory: 0, operational: 0, overhead: 0 }
  );

  // Combine both CostExpense and CostOperation totals
  const combinedTotals = {
    total: costExpensesTotals.total + costOperationTotals.total,
    inventory: costExpensesTotals.inventory || 0,
    operational:
      (costExpensesTotals.operational || 0) + costOperationTotals.operational,
    overhead: (costExpensesTotals.overhead || 0) + costOperationTotals.overhead,
  };

  return {
    lowStockCount: lowStockProducts.length,
    dailySales: dailySales[0] || { totalSales: 0, transactionCount: 0 },
    weeklySales: weeklySales[0] || { totalSales: 0, transactionCount: 0 },
    recentTransactions,
    unreadNotifications,
    totalProducts,
    costExpenses: {
      total: combinedTotals.total,
      inventory: combinedTotals.inventory,
      operational: combinedTotals.operational,
      overhead: combinedTotals.overhead,
      breakdown: monthlyCostExpenses || [],
    },
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    // Use caching for dashboard data
    const dashboardData = await withCache(
      getDashboardData,
      CacheConfigs.dashboard
    );

    const response = {
      success: true,
      data: {
        dailySales: {
          amount: dashboardData.dailySales.totalSales,
          transactionCount: dashboardData.dailySales.transactionCount,
        },
        weeklySales: {
          amount: dashboardData.weeklySales.totalSales,
          transactionCount: dashboardData.weeklySales.transactionCount,
        },
        lowStockCount: dashboardData.lowStockCount,
        unreadNotifications: dashboardData.unreadNotifications,
        totalProducts: dashboardData.totalProducts,
        costExpenses: dashboardData.costExpenses,
        recentTransactions: dashboardData.recentTransactions.map(
          (transaction: any) => ({
            _id: transaction._id,
            totalAmount: transaction.totalAmount,
            paymentMethod: transaction.paymentMethod,
            itemCount: transaction.items.length,
            createdAt: transaction.createdAt,
            items: transaction.items.map((item: any) => ({
              productName: item.productId?.name || "Unknown Product",
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            })),
          })
        ),
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=120, stale-while-revalidate=240",
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DASHBOARD_FETCH_ERROR",
          message: "Failed to fetch dashboard data",
        },
      },
      { status: 500 }
    );
  }
}
