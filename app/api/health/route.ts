// Health check endpoint for monitoring
import { NextRequest, NextResponse } from "next/server";
import { HealthCheck, logger } from "@/lib/utils/error-monitoring";
import { getCacheStats } from "@/lib/utils/api-cache";
import connectDB from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    // Perform health checks
    const healthStatus = await HealthCheck.overall();
    const memoryStatus = await HealthCheck.memory();
    const cacheStats = getCacheStats();

    // Check database connection
    let dbStatus = false;
    try {
      await connectDB();
      dbStatus = true;
    } catch (error) {
      logger.error("Database health check failed", error as Error);
    }

    const response = {
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
      checks: {
        database: dbStatus,
        memory: memoryStatus.percentage < 90,
        cache: cacheStats.totalKeys >= 0, // Cache is working if we can get stats
      },
      metrics: {
        memory: {
          used: `${Math.round(memoryStatus.used / 1024 / 1024)}MB`,
          total: `${Math.round(memoryStatus.total / 1024 / 1024)}MB`,
          percentage: `${Math.round(memoryStatus.percentage)}%`,
        },
        cache: {
          totalKeys: cacheStats.totalKeys,
          memoryUsage: `${Math.round(cacheStats.memoryUsage / 1024)}KB`,
        },
        uptime: `${Math.round(process.uptime())}s`,
      },
    };

    // Return appropriate status code
    const statusCode =
      healthStatus.status === "healthy"
        ? 200
        : healthStatus.status === "degraded"
        ? 200
        : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    logger.error("Health check endpoint error", error as Error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Health check failed",
      },
      { status: 503 }
    );
  }
}

// Simple ping endpoint for basic availability checks
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
