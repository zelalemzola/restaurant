// Optimized dashboard API route demonstrating performance improvements
import { NextRequest, NextResponse } from "next/server";
import { withCache, CacheConfigs } from "@/lib/utils/api-cache";
import { withErrorHandling, logger } from "@/lib/utils/error-monitoring";
import {
  withPerformanceMonitoring,
  RateLimiter,
} from "@/lib/middleware/performance";
import {
  AggregationPipelines,
  QueryOptimizations,
} from "@/lib/utils/database-optimization";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import SalesTransaction from "@/lib/models/SalesTransaction";
import StockTransaction from "@/lib/models/StockTransaction";
import CostOperation from "@/lib/models/CostOperation";
import Notification from "@/lib/models/Notification";

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

  // Use Promise.all for parallel execution
  const [
    lowStockProducts,
    todaySales,
    recentTransactions,
    unreadNotifications,
    totalProducts,
  ] = await Promise.all([
    // Low stock products using aggregation pipeline
    Product.aggregate(AggregationPipelines.lowStockProducts()).exec(),

    // Today's sales with optimized query
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

    // Recent transactions with minimal projection
    SalesTransaction.find(
      QueryOptimizations.dateRange(
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        new Date()
      ),
      QueryOptimizations.minimalTransaction
    )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()
      .exec(),

    // Unread notifications count (for system user)
    Notification.countDocuments({ read: false, userId: "system" }).exec(),

    // Total products count
    Product.countDocuments().exec(),
  ]);

  return {
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 5), // Limit to 5 for dashboard
    todaySales: todaySales[0] || { totalSales: 0, transactionCount: 0 },
    recentTransactions,
    unreadNotifications,
    totalProducts,
    lastUpdated: new Date().toISOString(),
  };
}

// Main API handler with all optimizations
async function handler(req: NextRequest) {
  // Rate limiting
  const clientIP =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  if (RateLimiter.isRateLimited(clientIP)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          retryAfter: Math.ceil(
            (RateLimiter.getResetTime(clientIP) - Date.now()) / 1000
          ),
        },
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": process.env.RATE_LIMIT_MAX || "100",
          "X-RateLimit-Remaining":
            RateLimiter.getRemainingRequests(clientIP).toString(),
          "X-RateLimit-Reset": RateLimiter.getResetTime(clientIP).toString(),
          "Retry-After": Math.ceil(
            (RateLimiter.getResetTime(clientIP) - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  try {
    // Use caching for dashboard data
    const dashboardData = await withCache(getDashboardData, {
      ...CacheConfigs.dashboard,
      key: "dashboard_optimized",
    });

    logger.info("Dashboard data fetched successfully", {
      additionalData: {
        lowStockCount: dashboardData.lowStockCount,
        todaySales: dashboardData.todaySales.totalSales,
        cached: true,
      },
    });

    // Return cached response with appropriate headers
    const response = NextResponse.json({
      success: true,
      data: dashboardData,
    });

    // Add rate limiting headers
    response.headers.set(
      "X-RateLimit-Limit",
      process.env.RATE_LIMIT_MAX || "100"
    );
    response.headers.set(
      "X-RateLimit-Remaining",
      RateLimiter.getRemainingRequests(clientIP).toString()
    );
    response.headers.set(
      "X-RateLimit-Reset",
      RateLimiter.getResetTime(clientIP).toString()
    );

    // Add cache headers
    response.headers.set(
      "Cache-Control",
      "public, max-age=120, stale-while-revalidate=240"
    );
    response.headers.set("X-Cache-Status", "HIT");

    return response;
  } catch (error) {
    logger.error("Dashboard API error", error as Error, {
      endpoint: req.url,
      method: req.method,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch dashboard data",
        },
      },
      { status: 500 }
    );
  }
}

// Apply all middleware
export const GET = withPerformanceMonitoring(withErrorHandling(handler));

// Disable static optimization for this route to ensure fresh data
export const dynamic = "force-dynamic";
export const revalidate = 120; // Revalidate every 2 minutes
