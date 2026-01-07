// Database optimization utilities
import mongoose from "mongoose";

// Connection pool optimization
export function optimizeConnectionPool() {
  // Set mongoose options for better performance
  mongoose.set("bufferCommands", false);

  // Enable query result caching
  mongoose.set("debug", process.env.NODE_ENV === "development");
}

// Initialize database indexes for optimal query performance
export async function initializeIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    // Product collection indexes
    await db.collection("products").createIndexes([
      { key: { groupId: 1 }, background: true },
      { key: { type: 1 }, background: true },
      { key: { currentQuantity: 1 }, background: true },
      { key: { name: "text" }, background: true }, // Text search
      { key: { minStockLevel: 1 }, background: true },
      { key: { groupId: 1, type: 1 }, background: true }, // Compound for filtering
      { key: { currentQuantity: 1, minStockLevel: 1 }, background: true }, // For low stock queries
    ]);

    // StockTransaction collection indexes
    await db.collection("stocktransactions").createIndexes([
      { key: { productId: 1 }, background: true },
      { key: { type: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { userId: 1 }, background: true },
      { key: { productId: 1, createdAt: -1 }, background: true }, // Product history
      { key: { type: 1, createdAt: -1 }, background: true }, // Transaction type analytics
    ]);

    // SalesTransaction collection indexes
    await db.collection("salestransactions").createIndexes([
      { key: { createdAt: -1 }, background: true },
      { key: { paymentMethod: 1 }, background: true },
      { key: { userId: 1 }, background: true },
      { key: { "items.productId": 1 }, background: true },
      { key: { createdAt: -1, paymentMethod: 1 }, background: true }, // Analytics
      { key: { createdAt: -1, totalAmount: -1 }, background: true }, // Revenue analytics
    ]);

    // CostOperation collection indexes
    await db.collection("costoperations").createIndexes([
      { key: { category: 1 }, background: true },
      { key: { type: 1 }, background: true },
      { key: { date: -1 }, background: true },
      { key: { userId: 1 }, background: true },
      { key: { date: -1, category: 1 }, background: true }, // Cost analytics
      { key: { type: 1, recurringPeriod: 1 }, background: true }, // Recurring costs
    ]);

    // Notification collection indexes
    await db.collection("notifications").createIndexes([
      { key: { type: 1 }, background: true },
      { key: { read: 1 }, background: true },
      { key: { createdAt: -1 }, background: true },
      { key: { userId: 1 }, background: true },
      { key: { read: 1, createdAt: -1 }, background: true }, // Unread notifications
    ]);

    // ProductGroup collection indexes
    await db.collection("productgroups").createIndexes([
      { key: { name: "text" }, background: true }, // Text search
    ]);

    console.log("Database indexes initialized successfully");
  } catch (error) {
    console.error("Error initializing database indexes:", error);
  }
}

// Query optimization helpers
export const QueryOptimizations = {
  // Lean queries for read-only operations
  lean: { lean: true },

  // Projection for minimal data transfer
  minimalProduct: {
    name: 1,
    currentQuantity: 1,
    minStockLevel: 1,
    type: 1,
    metric: 1,
    costPrice: 1,
    sellingPrice: 1,
    groupId: 1,
    createdAt: 1,
  },

  minimalTransaction: {
    totalAmount: 1,
    createdAt: 1,
    paymentMethod: 1,
  },

  // Pagination helper
  paginate: (page: number, limit: number = 20) => ({
    skip: (page - 1) * limit,
    limit,
  }),

  // Date range queries
  dateRange: (startDate: Date, endDate: Date) => ({
    createdAt: {
      $gte: startDate,
      $lte: endDate,
    },
  }),
};

// Aggregation pipeline optimizations
export const AggregationPipelines = {
  // Low stock products
  lowStockProducts: () => [
    {
      $match: {
        $expr: { $lte: ["$currentQuantity", "$minStockLevel"] },
      },
    },
    {
      $lookup: {
        from: "productgroups",
        localField: "groupId",
        foreignField: "_id",
        as: "group",
      },
    },
    {
      $project: {
        name: 1,
        currentQuantity: 1,
        minStockLevel: 1,
        "group.name": 1,
      },
    },
  ],

  // Sales analytics by date range
  salesAnalytics: (startDate: Date, endDate: Date) => [
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        totalSales: { $sum: "$totalAmount" },
        transactionCount: { $sum: 1 },
        paymentMethods: { $push: "$paymentMethod" },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ],

  // Product performance analytics
  productPerformance: (startDate: Date, endDate: Date) => [
    {
      $match: {
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $unwind: "$items",
    },
    {
      $group: {
        _id: "$items.productId",
        totalQuantitySold: { $sum: "$items.quantity" },
        totalRevenue: { $sum: "$items.totalPrice" },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    {
      $unwind: "$product",
    },
    {
      $project: {
        productName: "$product.name",
        totalQuantitySold: 1,
        totalRevenue: 1,
        transactionCount: 1,
        averagePrice: {
          $divide: ["$totalRevenue", "$totalQuantitySold"],
        },
      },
    },
    {
      $sort: { totalRevenue: -1 },
    },
  ],
};
