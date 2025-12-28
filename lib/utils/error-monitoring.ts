// Error monitoring and logging utilities
import { NextRequest } from "next/server";

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp?: Date;
  stack?: string;
  additionalData?: Record<string, any>;
}

export interface LogLevel {
  ERROR: "error";
  WARN: "warn";
  INFO: "info";
  DEBUG: "debug";
}

export const LOG_LEVELS: LogLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
};

// Enhanced logger class
export class Logger {
  private static instance: Logger;
  private logLevel: string;

  private constructor() {
    this.logLevel = process.env.LOG_LEVEL || "info";
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: string): boolean {
    const levels = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLog(level: string, message: string, context?: ErrorContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...context,
    };

    return JSON.stringify(logEntry, null, 2);
  }

  error(message: string, error?: Error, context?: ErrorContext) {
    if (!this.shouldLog("error")) return;

    const errorContext: ErrorContext = {
      ...context,
      stack: error?.stack,
      timestamp: new Date(),
    };

    const logMessage = this.formatLog("error", message, errorContext);
    console.error(logMessage);

    // In production, send to external monitoring service
    if (process.env.NODE_ENV === "production") {
      this.sendToMonitoringService("error", message, errorContext);
    }
  }

  warn(message: string, context?: ErrorContext) {
    if (!this.shouldLog("warn")) return;
    console.warn(this.formatLog("warn", message, context));
  }

  info(message: string, context?: ErrorContext) {
    if (!this.shouldLog("info")) return;
    console.info(this.formatLog("info", message, context));
  }

  debug(message: string, context?: ErrorContext) {
    if (!this.shouldLog("debug")) return;
    console.debug(this.formatLog("debug", message, context));
  }

  private async sendToMonitoringService(
    level: string,
    message: string,
    context: ErrorContext
  ) {
    // Placeholder for external monitoring service integration
    // Examples: Sentry, LogRocket, DataDog, etc.
    try {
      // Example implementation:
      // await fetch('/api/monitoring/log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ level, message, context })
      // });
    } catch (error) {
      console.error("Failed to send log to monitoring service:", error);
    }
  }
}

// Global error handler for unhandled promises and exceptions
export function setupGlobalErrorHandling() {
  const logger = Logger.getInstance();

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Promise Rejection", reason as Error, {
      additionalData: { promise: promise.toString() },
    });
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", error);
    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  });
}

// API error handler middleware
export function withErrorHandling<T>(
  handler: (req: NextRequest, context?: any) => Promise<T>
) {
  return async (req: NextRequest, context?: any): Promise<T> => {
    const logger = Logger.getInstance();
    const requestId = generateRequestId();

    try {
      // Log request
      logger.info("API Request", {
        requestId,
        endpoint: req.url,
        method: req.method,
        userAgent: req.headers.get("user-agent") || undefined,
        ip:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          undefined,
      });

      const result = await handler(req, context);

      // Log successful response
      logger.info("API Response Success", {
        requestId,
        endpoint: req.url,
        method: req.method,
      });

      return result;
    } catch (error) {
      // Log error with context
      logger.error("API Error", error as Error, {
        requestId,
        endpoint: req.url,
        method: req.method,
        userAgent: req.headers.get("user-agent") || undefined,
        ip:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          undefined,
      });

      throw error;
    }
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private static timers = new Map<string, number>();

  static startTimer(label: string): void {
    this.timers.set(label, Date.now());
  }

  static endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      console.warn(`Timer '${label}' was not started`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.timers.delete(label);

    const logger = Logger.getInstance();
    logger.info("Performance Metric", {
      additionalData: {
        operation: label,
        duration: `${duration}ms`,
      },
    });

    return duration;
  }

  static async measureAsync<T>(
    label: string,
    operation: () => Promise<T>
  ): Promise<T> {
    this.startTimer(label);
    try {
      const result = await operation();
      this.endTimer(label);
      return result;
    } catch (error) {
      this.endTimer(label);
      throw error;
    }
  }
}

// Database query performance monitoring
export function withQueryMonitoring<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  return PerformanceMonitor.measureAsync(`db_query_${queryName}`, query);
}

// Request ID generation
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check utilities
export const HealthCheck = {
  async database(): Promise<boolean> {
    try {
      // Check database connection
      const mongoose = require("mongoose");
      return mongoose.connection.readyState === 1;
    } catch {
      return false;
    }
  },

  async memory(): Promise<{ used: number; total: number; percentage: number }> {
    const used = process.memoryUsage();
    const total = used.heapTotal;
    return {
      used: used.heapUsed,
      total,
      percentage: (used.heapUsed / total) * 100,
    };
  },

  async overall(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: Record<string, boolean>;
    timestamp: string;
  }> {
    const checks = {
      database: await this.database(),
      memory: (await this.memory()).percentage < 90,
    };

    const allHealthy = Object.values(checks).every(Boolean);
    const status = allHealthy ? "healthy" : "degraded";

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    };
  },
};

// Export singleton logger instance
export const logger = Logger.getInstance();
