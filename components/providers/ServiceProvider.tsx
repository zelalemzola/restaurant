"use client";

import { useEffect } from "react";

// Service initialization component
export function ServiceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize services on client side
    const initializeServices = async () => {
      try {
        // Initialize low stock monitoring
        const { initializeLowStockMonitoring } = await import(
          "@/lib/services/lowStockMonitor"
        );
        initializeLowStockMonitoring(30); // Check every 30 minutes

        // Initialize notification service cleanup
        const { initializeNotificationService } = await import(
          "@/lib/services/NotificationService"
        );
        initializeNotificationService();

        // Initialize notifications for existing low stock items
        const { initializeNotifications } = await import(
          "@/lib/utils/initializeNotifications"
        );
        setTimeout(() => {
          // Delay initialization to ensure services are ready
          initializeNotifications();
        }, 5000); // 5 second delay

        console.log("Services initialized successfully");
      } catch (error) {
        console.error("Error initializing services:", error);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      const cleanup = async () => {
        try {
          const { cleanupLowStockMonitoring } = await import(
            "@/lib/services/lowStockMonitor"
          );
          const { cleanupNotificationService } = await import(
            "@/lib/services/NotificationService"
          );

          cleanupLowStockMonitoring();
          cleanupNotificationService();

          console.log("Services cleaned up");
        } catch (error) {
          console.error("Error cleaning up services:", error);
        }
      };

      cleanup();
    };
  }, []);

  return <>{children}</>;
}
