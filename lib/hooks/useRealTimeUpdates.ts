// Client-side real-time updates hook
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { api } from "@/lib/store/api";

interface RealTimeUpdateOptions {
  enableProducts?: boolean;
  enableSales?: boolean;
  enableInventory?: boolean;
  enableCosts?: boolean;
  enableNotifications?: boolean;
}

export function useRealTimeUpdates(options: RealTimeUpdateOptions = {}) {
  const dispatch = useDispatch();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Record<string, number>>({});

  const {
    enableProducts = true,
    enableSales = true,
    enableInventory = true,
    enableCosts = true,
    enableNotifications = true,
  } = options;

  useEffect(() => {
    // Function to check for updates and invalidate cache
    const checkForUpdates = () => {
      const now = Date.now();

      // Check if we should refresh products data
      if (
        enableProducts &&
        (!lastUpdateRef.current.products ||
          now - lastUpdateRef.current.products > 5000)
      ) {
        dispatch(api.util.invalidateTags(["Product"]));
        lastUpdateRef.current.products = now;
      }

      // Check if we should refresh sales data
      if (
        enableSales &&
        (!lastUpdateRef.current.sales ||
          now - lastUpdateRef.current.sales > 5000)
      ) {
        dispatch(api.util.invalidateTags(["SalesTransaction"]));
        lastUpdateRef.current.sales = now;
      }

      // Check if we should refresh inventory data
      if (
        enableInventory &&
        (!lastUpdateRef.current.inventory ||
          now - lastUpdateRef.current.inventory > 5000)
      ) {
        dispatch(api.util.invalidateTags(["StockTransaction"]));
        lastUpdateRef.current.inventory = now;
      }

      // Check if we should refresh costs data
      if (
        enableCosts &&
        (!lastUpdateRef.current.costs ||
          now - lastUpdateRef.current.costs > 10000)
      ) {
        dispatch(api.util.invalidateTags(["CostOperation"]));
        lastUpdateRef.current.costs = now;
      }

      // Check if we should refresh notifications
      if (
        enableNotifications &&
        (!lastUpdateRef.current.notifications ||
          now - lastUpdateRef.current.notifications > 3000)
      ) {
        dispatch(api.util.invalidateTags(["Notification"]));
        lastUpdateRef.current.notifications = now;
      }

      // Always refresh analytics less frequently
      if (
        !lastUpdateRef.current.analytics ||
        now - lastUpdateRef.current.analytics > 30000
      ) {
        dispatch(api.util.invalidateTags(["Analytics"]));
        lastUpdateRef.current.analytics = now;
      }
    };

    // Start polling for updates every 2 seconds
    intervalRef.current = setInterval(checkForUpdates, 2000);

    // Initial check
    checkForUpdates();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    dispatch,
    enableProducts,
    enableSales,
    enableInventory,
    enableCosts,
    enableNotifications,
  ]);

  // Manual refresh function
  const refreshAll = () => {
    dispatch(
      api.util.invalidateTags([
        "Product",
        "SalesTransaction",
        "StockTransaction",
        "CostOperation",
        "Notification",
        "Analytics",
      ])
    );
    lastUpdateRef.current = {};
  };

  const refreshProducts = () => {
    dispatch(api.util.invalidateTags(["Product"]));
    lastUpdateRef.current.products = Date.now();
  };

  const refreshSales = () => {
    dispatch(api.util.invalidateTags(["SalesTransaction"]));
    lastUpdateRef.current.sales = Date.now();
  };

  const refreshInventory = () => {
    dispatch(api.util.invalidateTags(["StockTransaction"]));
    lastUpdateRef.current.inventory = Date.now();
  };

  return {
    refreshAll,
    refreshProducts,
    refreshSales,
    refreshInventory,
  };
}

// Hook for components that need immediate updates after mutations
export function useOptimisticUpdates() {
  const dispatch = useDispatch();

  const invalidateAfterMutation = (tags: string[]) => {
    // Immediately invalidate the specified tags
    dispatch(api.util.invalidateTags(tags as any));
  };

  return {
    invalidateAfterMutation,
  };
}
