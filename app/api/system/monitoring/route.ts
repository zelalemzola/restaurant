// System monitoring API endpoint
import { NextRequest, NextResponse } from "next/server";
import { logger, PerformanceMonitor } from "@/lib/utils/error-monitoring";
import { getCacheStats } from "@/lib/utils/api-cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    let data: any = {};

    switch (type) {
      case "performance":
        data = {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          // Add any performance metrics you want to track
        };
        break;

      case "cache":
        data = getCacheStats();
        break;

      case "all":
      default:
        data = {
          performance: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
          },
          cache: getCacheStats(),
          system: {
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            nodeVersion: process.version,
            platform: process.platform,
            environment: process.env.NODE_ENV,
          },
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "Failed to fetch monitoring data",
      error instanceof Error ? error : new Error(String(error)),
      {
        endpoint: request.url,
        method: request.method,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MONITORING_ERROR",
          message: "Failed to fetch monitoring data",
        },
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
