import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import SalesTransaction from "@/lib/models/SalesTransaction";
import Notification from "@/lib/models/Notification";
import {
  AggregationPipelines,
  QueryOptimizations,
} from "@/lib/utils/database-optimization";
import { withCache, CacheConfigs } from "@/lib/utils/api-cache";

// Optimized dashboard data fetcher
async function getDashboardData() {
  await connectDB();

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

    // Unread notifications count
    Notification.countDocuments({ isRead: false }).exec(),

    // Total products count
    Product.countDocuments().exec(),
  ]);

  return {
    lowStockCount: lowStockProducts.length,
    dailySales: dailySales[0] || { totalSales: 0, transactionCount: 0 },
    weeklySales: weeklySales[0] || { totalSales: 0, transactionCount: 0 },
    recentTransactions,
    unreadNotifications,
    totalProducts,
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
