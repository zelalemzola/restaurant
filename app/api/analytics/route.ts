// Financial Analytics API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesTransaction from "@/lib/models/SalesTransaction";
import CostOperation from "@/lib/models/CostOperation";
import CostExpense from "@/lib/models/CostExpense";
import Product from "@/lib/models/Product";
import mongoose from "mongoose";

interface FinancialAnalytics {
  revenue: {
    total: number;
    byPeriod: Array<{ date: string; amount: number }>;
    byPaymentMethod: Array<{
      method: string;
      amount: number;
      percentage: number;
    }>;
  };
  costs: {
    total: number;
    byPeriod: Array<{ date: string; amount: number }>;
    byCategory: Array<{ category: string; amount: number; percentage: number }>;
  };
  profit: {
    total: number;
    margin: number;
    byPeriod: Array<{
      date: string;
      revenue: number;
      costs: number;
      profit: number;
      margin: number;
    }>;
  };
  combinationItems: {
    profitMargins: Array<{
      productId: string;
      productName: string;
      costPrice: number;
      sellingPrice: number;
      margin: number;
      marginPercentage: number;
      totalSold: number;
      totalProfit: number;
    }>;
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const period = searchParams.get("period") || "daily"; // daily, weekly, monthly

    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const queryStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const queryEndDate = endDate ? new Date(endDate) : defaultEndDate;

    // Ensure end date includes the full day
    queryEndDate.setHours(23, 59, 59, 999);

    // Get sales data
    const salesData = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      {
        $unwind: "$items",
      },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "itemProduct",
        },
      },
      {
        $unwind: "$itemProduct",
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          transactions: { $push: "$$ROOT" },
        },
      },
    ]);

    // Get operational costs data
    const costsData = await CostOperation.aggregate([
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCosts: { $sum: "$amount" },
          operations: { $push: "$$ROOT" },
        },
      },
    ]);

    // Get inventory expenses data
    const inventoryExpensesData = await CostExpense.aggregate([
      {
        $match: {
          recordedAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalInventoryExpenses: { $sum: "$totalAmount" },
          expenses: { $push: "$$ROOT" },
        },
      },
    ]);

    const totalRevenue = salesData[0]?.totalRevenue || 0;
    const operationalCosts = costsData[0]?.totalCosts || 0;
    const inventoryExpenses =
      inventoryExpensesData[0]?.totalInventoryExpenses || 0;
    const totalCosts = operationalCosts + inventoryExpenses;
    const totalProfit = totalRevenue - totalCosts;
    const profitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Revenue by period
    const revenueByPeriod = await getRevenueByPeriod(
      queryStartDate,
      queryEndDate,
      period
    );

    // Costs by period
    const costsByPeriod = await getCostsByPeriod(
      queryStartDate,
      queryEndDate,
      period
    );

    // Revenue by payment method
    const revenueByPaymentMethod = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          amount: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          method: "$_id",
          amount: 1,
          percentage: {
            $multiply: [{ $divide: ["$amount", totalRevenue || 1] }, 100],
          },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Costs by category (operational costs)
    const operationalCostsByCategory = await CostOperation.aggregate([
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          category: { $concat: ["operational_", "$_id"] },
          amount: 1,
          percentage: {
            $multiply: [{ $divide: ["$amount", totalCosts || 1] }, 100],
          },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Inventory costs by category
    const inventoryCostsByCategory = await CostExpense.aggregate([
      {
        $match: {
          recordedAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          category: { $concat: ["inventory_", "$_id"] },
          amount: 1,
          percentage: {
            $multiply: [{ $divide: ["$amount", totalCosts || 1] }, 100],
          },
        },
      },
      { $sort: { amount: -1 } },
    ]);

    // Combine both cost categories
    const costsByCategory = [
      ...operationalCostsByCategory,
      ...inventoryCostsByCategory,
    ].sort((a, b) => b.amount - a.amount);

    // Profit by period
    const profitByPeriod = await getProfitByPeriod(
      queryStartDate,
      queryEndDate,
      period
    );

    // Combination items profit margins
    const combinationItemsData = await getCombinationItemsProfitMargins(
      queryStartDate,
      queryEndDate
    );

    const analytics: FinancialAnalytics = {
      revenue: {
        total: totalRevenue,
        byPeriod: revenueByPeriod,
        byPaymentMethod: revenueByPaymentMethod,
      },
      costs: {
        total: totalCosts,
        byPeriod: costsByPeriod,
        byCategory: costsByCategory,
      },
      profit: {
        total: totalProfit,
        margin: profitMargin,
        byPeriod: profitByPeriod,
      },
      combinationItems: {
        profitMargins: combinationItemsData,
      },
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching financial analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "ANALYTICS_ERROR",
          message: "Failed to fetch financial analytics",
        },
      },
      { status: 500 }
    );
  }
}

async function getRevenueByPeriod(
  startDate: Date,
  endDate: Date,
  period: string
) {
  const groupBy = getGroupByFormat(period);

  return await SalesTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        amount: { $sum: "$totalAmount" },
      },
    },
    {
      $project: {
        date: "$_id",
        amount: 1,
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);
}

async function getCostsByPeriod(
  startDate: Date,
  endDate: Date,
  period: string
) {
  const groupBy = getGroupByFormat(period);

  // Get operational costs by period
  const operationalCosts = await CostOperation.aggregate([
    {
      $match: {
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        amount: { $sum: "$amount" },
      },
    },
    {
      $project: {
        date: "$_id",
        amount: 1,
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);

  // Get inventory expenses by period
  const inventoryExpenses = await CostExpense.aggregate([
    {
      $match: {
        recordedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        amount: { $sum: "$totalAmount" },
      },
    },
    {
      $project: {
        date: "$_id",
        amount: 1,
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);

  // Combine operational costs and inventory expenses by date
  const combinedCosts = new Map();

  operationalCosts.forEach((item) => {
    combinedCosts.set(item.date, item.amount);
  });

  inventoryExpenses.forEach((item) => {
    const existing = combinedCosts.get(item.date) || 0;
    combinedCosts.set(item.date, existing + item.amount);
  });

  // Convert back to array format
  return Array.from(combinedCosts.entries())
    .map(([date, amount]) => ({
      date,
      amount,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getProfitByPeriod(
  startDate: Date,
  endDate: Date,
  period: string
) {
  const groupBy = getGroupByFormat(period);

  // Get revenue data
  const revenueData = await SalesTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        revenue: { $sum: "$totalAmount" },
      },
    },
  ]);

  // Get combined costs data (operational + inventory)
  const costsData = await getCostsByPeriod(startDate, endDate, period);

  // Merge revenue and costs data
  const profitData = new Map();

  revenueData.forEach((item) => {
    profitData.set(item._id, {
      date: item._id,
      revenue: item.revenue,
      costs: 0,
    });
  });

  costsData.forEach((item) => {
    const existing = profitData.get(item.date) || {
      date: item.date,
      revenue: 0,
      costs: 0,
    };
    existing.costs = item.amount;
    profitData.set(item.date, existing);
  });

  return Array.from(profitData.values())
    .map((item) => ({
      ...item,
      profit: item.revenue - item.costs,
      margin:
        item.revenue > 0
          ? ((item.revenue - item.costs) / item.revenue) * 100
          : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getCombinationItemsProfitMargins(
  startDate: Date,
  endDate: Date
) {
  return await SalesTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $match: {
        "product.type": "combination",
      },
    },
    {
      $group: {
        _id: "$items.productId",
        productName: { $first: "$product.name" },
        costPrice: { $first: "$product.costPrice" },
        sellingPrice: { $first: "$product.sellingPrice" },
        totalSold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
      },
    },
    {
      $project: {
        productId: "$_id",
        productName: 1,
        costPrice: 1,
        sellingPrice: 1,
        totalSold: 1,
        margin: { $subtract: ["$sellingPrice", "$costPrice"] },
        marginPercentage: {
          $multiply: [
            {
              $divide: [
                { $subtract: ["$sellingPrice", "$costPrice"] },
                "$sellingPrice",
              ],
            },
            100,
          ],
        },
        totalProfit: {
          $multiply: [
            "$totalSold",
            { $subtract: ["$sellingPrice", "$costPrice"] },
          ],
        },
        _id: 0,
      },
    },
    { $sort: { totalProfit: -1 } },
  ]);
}

function getGroupByFormat(period: string) {
  switch (period) {
    case "daily":
      return {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
        },
      };
    case "weekly":
      return {
        $dateToString: {
          format: "%Y-W%U",
          date: "$createdAt",
        },
      };
    case "monthly":
      return {
        $dateToString: {
          format: "%Y-%m",
          date: "$createdAt",
        },
      };
    default:
      return {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$createdAt",
        },
      };
  }
}
