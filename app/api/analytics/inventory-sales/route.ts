// Inventory and Sales Analytics API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesTransaction from "@/lib/models/SalesTransaction";
import StockTransaction from "@/lib/models/StockTransaction";
import Product from "@/lib/models/Product";
import mongoose from "mongoose";

interface InventorySalesAnalytics {
  salesTrends: {
    byPeriod: Array<{
      date: string;
      totalSales: number;
      transactionCount: number;
      averageOrderValue: number;
    }>;
    byProduct: Array<{
      productId: string;
      productName: string;
      totalQuantitySold: number;
      totalRevenue: number;
      transactionCount: number;
      averagePrice: number;
    }>;
  };
  popularProducts: {
    byQuantity: Array<{
      productId: string;
      productName: string;
      productType: string;
      totalQuantitySold: number;
      totalRevenue: number;
      transactionCount: number;
      rank: number;
    }>;
    byRevenue: Array<{
      productId: string;
      productName: string;
      productType: string;
      totalQuantitySold: number;
      totalRevenue: number;
      transactionCount: number;
      rank: number;
    }>;
  };
  paymentMethodDistribution: Array<{
    method: string;
    transactionCount: number;
    totalAmount: number;
    percentage: number;
    averageTransactionValue: number;
  }>;
  inventoryTurnover: {
    byProduct: Array<{
      productId: string;
      productName: string;
      productType: string;
      currentStock: number;
      averageStock: number;
      totalUsage: number;
      turnoverRate: number;
      daysToTurnover: number;
      stockStatus: string;
    }>;
    summary: {
      averageTurnoverRate: number;
      fastMovingItems: number;
      slowMovingItems: number;
      totalProducts: number;
    };
  };
  stockUsagePatterns: {
    byPeriod: Array<{
      date: string;
      totalUsage: number;
      usageTransactions: number;
      topUsedProducts: Array<{
        productName: string;
        quantity: number;
      }>;
    }>;
    byProduct: Array<{
      productId: string;
      productName: string;
      totalUsage: number;
      usageFrequency: number;
      averageUsagePerTransaction: number;
      lastUsedDate: string;
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

    // Get sales trends
    const salesTrends = await getSalesTrends(
      queryStartDate,
      queryEndDate,
      period
    );

    // Get popular products
    const popularProducts = await getPopularProducts(
      queryStartDate,
      queryEndDate
    );

    // Get payment method distribution
    const paymentMethodDistribution = await getPaymentMethodDistribution(
      queryStartDate,
      queryEndDate
    );

    // Get inventory turnover
    const inventoryTurnover = await getInventoryTurnover(
      queryStartDate,
      queryEndDate
    );

    // Get stock usage patterns
    const stockUsagePatterns = await getStockUsagePatterns(
      queryStartDate,
      queryEndDate,
      period
    );

    const analytics: InventorySalesAnalytics = {
      salesTrends,
      popularProducts,
      paymentMethodDistribution,
      inventoryTurnover,
      stockUsagePatterns,
    };

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching inventory and sales analytics:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVENTORY_SALES_ANALYTICS_ERROR",
          message: "Failed to fetch inventory and sales analytics",
        },
      },
      { status: 500 }
    );
  }
}

async function getSalesTrends(startDate: Date, endDate: Date, period: string) {
  const groupBy = getGroupByFormat(period);

  // Sales by period
  const byPeriod = await SalesTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: groupBy,
        totalSales: { $sum: "$totalAmount" },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        date: "$_id",
        totalSales: 1,
        transactionCount: 1,
        averageOrderValue: {
          $divide: ["$totalSales", "$transactionCount"],
        },
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);

  // Sales by product
  const byProduct = await SalesTransaction.aggregate([
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
      $group: {
        _id: "$items.productId",
        productName: { $first: "$product.name" },
        totalQuantitySold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        productId: "$_id",
        productName: 1,
        totalQuantitySold: 1,
        totalRevenue: 1,
        transactionCount: 1,
        averagePrice: {
          $divide: ["$totalRevenue", "$totalQuantitySold"],
        },
        _id: 0,
      },
    },
    { $sort: { totalRevenue: -1 } },
  ]);

  return { byPeriod, byProduct };
}

async function getPopularProducts(startDate: Date, endDate: Date) {
  const baseAggregation = [
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
      $group: {
        _id: "$items.productId",
        productName: { $first: "$product.name" },
        productType: { $first: "$product.type" },
        totalQuantitySold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        productId: "$_id",
        productName: 1,
        productType: 1,
        totalQuantitySold: 1,
        totalRevenue: 1,
        transactionCount: 1,
        _id: 0,
      },
    },
  ];

  // By quantity sold
  const byQuantity = await SalesTransaction.aggregate([
    ...baseAggregation,
    { $sort: { totalQuantitySold: -1 } },
    { $limit: 20 },
    {
      $addFields: {
        rank: { $add: [{ $indexOfArray: [[], null] }, 1] },
      },
    },
  ]);

  // Add rank manually for quantity
  byQuantity.forEach((item, index) => {
    item.rank = index + 1;
  });

  // By revenue
  const byRevenue = await SalesTransaction.aggregate([
    ...baseAggregation,
    { $sort: { totalRevenue: -1 } },
    { $limit: 20 },
  ]);

  // Add rank manually for revenue
  byRevenue.forEach((item, index) => {
    item.rank = index + 1;
  });

  return { byQuantity, byRevenue };
}

async function getPaymentMethodDistribution(startDate: Date, endDate: Date) {
  const totalTransactions = await SalesTransaction.countDocuments({
    createdAt: { $gte: startDate, $lte: endDate },
  });

  const totalAmount = await SalesTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$totalAmount" },
      },
    },
  ]);

  const totalAmountValue = totalAmount[0]?.total || 0;

  return await SalesTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        transactionCount: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
    {
      $project: {
        method: "$_id",
        transactionCount: 1,
        totalAmount: 1,
        percentage: {
          $multiply: [
            { $divide: ["$transactionCount", totalTransactions || 1] },
            100,
          ],
        },
        averageTransactionValue: {
          $divide: ["$totalAmount", "$transactionCount"],
        },
        _id: 0,
      },
    },
    { $sort: { transactionCount: -1 } },
  ]);
}

async function getInventoryTurnover(startDate: Date, endDate: Date) {
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const byProduct = await Product.aggregate([
    {
      $lookup: {
        from: "stocktransactions",
        localField: "_id",
        foreignField: "productId",
        as: "stockTransactions",
      },
    },
    {
      $addFields: {
        // Filter stock transactions within date range
        relevantTransactions: {
          $filter: {
            input: "$stockTransactions",
            cond: {
              $and: [
                { $gte: ["$$this.createdAt", startDate] },
                { $lte: ["$$this.createdAt", endDate] },
              ],
            },
          },
        },
      },
    },
    {
      $addFields: {
        totalUsage: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$relevantTransactions",
                  cond: {
                    $in: ["$$this.type", ["usage", "sale"]],
                  },
                },
              },
              as: "transaction",
              in: { $abs: "$$transaction.quantity" },
            },
          },
        },
        // Calculate average stock (simplified as current stock for now)
        averageStock: "$currentQuantity",
      },
    },
    {
      $project: {
        productId: "$_id",
        productName: "$name",
        productType: "$type",
        currentStock: "$currentQuantity",
        averageStock: "$averageStock",
        totalUsage: 1,
        turnoverRate: {
          $cond: {
            if: { $gt: ["$averageStock", 0] },
            then: { $divide: ["$totalUsage", "$averageStock"] },
            else: 0,
          },
        },
        daysToTurnover: {
          $cond: {
            if: { $gt: ["$totalUsage", 0] },
            then: {
              $divide: [
                { $multiply: ["$averageStock", daysDiff] },
                "$totalUsage",
              ],
            },
            else: 999,
          },
        },
        stockStatus: {
          $cond: {
            if: { $lte: ["$currentQuantity", "$minStockLevel"] },
            then: "low-stock",
            else: "in-stock",
          },
        },
        _id: 0,
      },
    },
    { $sort: { turnoverRate: -1 } },
  ]);

  // Calculate summary statistics
  const totalProducts = byProduct.length;
  const averageTurnoverRate =
    byProduct.reduce((sum, item) => sum + item.turnoverRate, 0) /
      totalProducts || 0;
  const fastMovingItems = byProduct.filter(
    (item) => item.turnoverRate > averageTurnoverRate
  ).length;
  const slowMovingItems = totalProducts - fastMovingItems;

  const summary = {
    averageTurnoverRate,
    fastMovingItems,
    slowMovingItems,
    totalProducts,
  };

  return { byProduct, summary };
}

async function getStockUsagePatterns(
  startDate: Date,
  endDate: Date,
  period: string
) {
  const groupBy = getGroupByFormat(period);

  // Usage by period
  const byPeriod = await StockTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        type: { $in: ["usage", "sale"] },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: {
          date: groupBy,
          productId: "$productId",
        },
        productName: { $first: "$product.name" },
        quantity: { $sum: { $abs: "$quantity" } },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        totalUsage: { $sum: "$quantity" },
        usageTransactions: { $sum: 1 },
        products: {
          $push: {
            productName: "$productName",
            quantity: "$quantity",
          },
        },
      },
    },
    {
      $project: {
        date: "$_id",
        totalUsage: 1,
        usageTransactions: 1,
        topUsedProducts: {
          $slice: [
            {
              $sortArray: {
                input: "$products",
                sortBy: { quantity: -1 },
              },
            },
            5,
          ],
        },
        _id: 0,
      },
    },
    { $sort: { date: 1 } },
  ]);

  // Usage by product
  const byProduct = await StockTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        type: { $in: ["usage", "sale"] },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$productId",
        productName: { $first: "$product.name" },
        totalUsage: { $sum: { $abs: "$quantity" } },
        usageFrequency: { $sum: 1 },
        lastUsedDate: { $max: "$createdAt" },
      },
    },
    {
      $project: {
        productId: "$_id",
        productName: 1,
        totalUsage: 1,
        usageFrequency: 1,
        averageUsagePerTransaction: {
          $divide: ["$totalUsage", "$usageFrequency"],
        },
        lastUsedDate: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$lastUsedDate",
          },
        },
        _id: 0,
      },
    },
    { $sort: { totalUsage: -1 } },
  ]);

  return { byPeriod, byProduct };
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
