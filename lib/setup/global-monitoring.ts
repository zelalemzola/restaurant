// Global monitoring setup for the application
import { setupGlobalErrorHandling, logger } from "@/lib/utils/error-monitoring";

// Initialize global error monitoring
export function initializeGlobalMonitoring() {
  // Only run on server side
  if (typeof window === "undefined") {
    setupGlobalErrorHandling();

    logger.info("Application starting", {
      additionalData: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });

    // Log memory usage on startup
    const memoryUsage = process.memoryUsage();
    logger.info("Initial memory usage", {
      additionalData: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
    });
  }
}

// Client-side error monitoring
export function initializeClientMonitoring() {
  if (typeof window !== "undefined") {
    // Handle client-side errors
    window.addEventListener("error", (event) => {
      console.error("Client-side error:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack,
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      console.error("Unhandled promise rejection:", {
        reason: event.reason,
        promise: event.promise,
      });
    });

    // Performance monitoring for client-side
    if ("performance" in window && "getEntriesByType" in window.performance) {
      // Monitor page load performance
      window.addEventListener("load", () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType(
            "navigation"
          )[0] as PerformanceNavigationTiming;
          if (navigation) {
            console.info("Page load performance:", {
              domContentLoaded: Math.round(
                navigation.domContentLoadedEventEnd -
                  navigation.domContentLoadedEventStart
              ),
              loadComplete: Math.round(
                navigation.loadEventEnd - navigation.loadEventStart
              ),
              totalTime: Math.round(
                navigation.loadEventEnd - navigation.fetchStart
              ),
            });
          }
        }, 0);
      });
    }
  }
}

// Export initialization functions
export { logger };
