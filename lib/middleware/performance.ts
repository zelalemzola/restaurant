// Performance monitoring middleware
import { NextRequest, NextResponse } from "next/server";
import { PerformanceMonitor, logger } from "@/lib/utils/error-monitoring";

// Request timing middleware
export function withPerformanceMonitoring(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const requestId = `req_${startTime}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Start performance monitoring
      PerformanceMonitor.startTimer(requestId);

      // Execute the handler
      const response = await handler(req, context);

      // End performance monitoring
      const duration = PerformanceMonitor.endTimer(requestId);

      // Add performance headers
      response.headers.set("X-Response-Time", `${duration}ms`);
      response.headers.set("X-Request-ID", requestId);

      // Log slow requests (> 1 second)
      if (duration > 1000) {
        logger.warn("Slow API request detected", {
          requestId,
          endpoint: req.url,
          method: req.method,
          additionalData: {
            duration: `${duration}ms`,
          },
        });
      }

      return response;
    } catch (error) {
      // End timer even on error
      PerformanceMonitor.endTimer(requestId);
      throw error;
    }
  };
}

// Database query performance tracking
export function trackDatabaseQuery<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  return PerformanceMonitor.measureAsync(`db_${queryName}`, async () => {
    const result = await query();

    // Log slow database queries (> 500ms)
    const duration = Date.now();
    if (duration > 500) {
      logger.warn("Slow database query detected", {
        additionalData: {
          queryName,
          duration: `${duration}ms`,
        },
      });
    }

    return result;
  });
}

// Memory usage monitoring
export class MemoryMonitor {
  private static lastCheck = Date.now();
  private static threshold = 0.85; // 85% memory usage threshold

  static checkMemoryUsage(): void {
    const now = Date.now();

    // Check every 30 seconds
    if (now - this.lastCheck < 30000) {
      return;
    }

    this.lastCheck = now;

    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const usagePercentage = heapUsedMB / heapTotalMB;

    if (usagePercentage > this.threshold) {
      logger.warn("High memory usage detected", {
        additionalData: {
          heapUsed: `${Math.round(heapUsedMB)}MB`,
          heapTotal: `${Math.round(heapTotalMB)}MB`,
          percentage: `${Math.round(usagePercentage * 100)}%`,
          rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
          external: `${Math.round(usage.external / 1024 / 1024)}MB`,
        },
      });

      // Suggest garbage collection in development
      if (process.env.NODE_ENV === "development" && global.gc) {
        global.gc();
        logger.info("Garbage collection triggered");
      }
    }
  }
}

// API rate limiting (simple in-memory implementation)
export class RateLimiter {
  private static requests = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private static maxRequests = parseInt(process.env.RATE_LIMIT_MAX || "100");
  private static windowMs = parseInt(process.env.RATE_LIMIT_WINDOW || "900000"); // 15 minutes

  static isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const requestData = this.requests.get(identifier);

    if (!requestData || now > requestData.resetTime) {
      // Reset or create new entry
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return false;
    }

    if (requestData.count >= this.maxRequests) {
      return true;
    }

    requestData.count++;
    return false;
  }

  static getRemainingRequests(identifier: string): number {
    const requestData = this.requests.get(identifier);
    if (!requestData || Date.now() > requestData.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - requestData.count);
  }

  static getResetTime(identifier: string): number {
    const requestData = this.requests.get(identifier);
    if (!requestData || Date.now() > requestData.resetTime) {
      return Date.now() + this.windowMs;
    }
    return requestData.resetTime;
  }

  // Cleanup expired entries
  static cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Auto cleanup rate limiter every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => {
    RateLimiter.cleanup();
    MemoryMonitor.checkMemoryUsage();
  }, 5 * 60 * 1000);
}

// Request size monitoring
export function checkRequestSize(
  req: NextRequest,
  maxSize: number = 5 * 1024 * 1024
): boolean {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > maxSize) {
    logger.warn("Large request detected", {
      additionalData: {
        contentLength: `${Math.round(parseInt(contentLength) / 1024)}KB`,
        maxSize: `${Math.round(maxSize / 1024)}KB`,
        endpoint: req.url,
      },
    });
    return false;
  }
  return true;
}
