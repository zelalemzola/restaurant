"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useGetStockLevelsQuery } from "@/lib/store/api";
import { useToast } from "@/hooks/use-toast";

interface StockAlert {
  productId: string;
  productName: string;
  currentQuantity: number;
  minStockLevel: number;
  metric: string;
  alertType: "low-stock" | "out-of-stock" | "restocked";
  timestamp: Date;
}

interface UseStockMonitoringOptions {
  enabled?: boolean;
  pollingInterval?: number;
  showToastAlerts?: boolean;
}

export function useStockMonitoring(options: UseStockMonitoringOptions = {}) {
  const {
    enabled = true,
    pollingInterval = 30000, // 30 seconds
    showToastAlerts = true,
  } = options;

  // Use useRef to avoid re-renders and maintain stable references
  const previousStockLevelsRef = useRef<Map<string, number>>(new Map());
  const isInitializedRef = useRef(false);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const { toast } = useToast();

  const {
    data: stockData,
    isLoading,
    error,
  } = useGetStockLevelsQuery(
    { limit: 1000 }, // Get all items for monitoring
    {
      pollingInterval: enabled ? pollingInterval : 0,
      skip: !enabled,
    }
  );

  const addAlert = useCallback((alert: StockAlert) => {
    setStockAlerts((prev) => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
  }, []);

  const showToastAlert = useCallback(
    (alert: StockAlert) => {
      if (!showToastAlerts) return;

      const { productName, currentQuantity, metric, alertType } = alert;

      switch (alertType) {
        case "out-of-stock":
          toast({
            title: "🚨 Out of Stock Alert",
            description: `${productName} is now out of stock!`,
            variant: "destructive",
          });
          break;
        case "low-stock":
          toast({
            title: "⚠️ Low Stock Alert",
            description: `${productName} is running low (${currentQuantity} ${metric} remaining)`,
            variant: "destructive",
          });
          break;
        case "restocked":
          toast({
            title: "✅ Stock Replenished",
            description: `${productName} has been restocked (${currentQuantity} ${metric})`,
          });
          break;
      }
    },
    [showToastAlerts, toast]
  );

  // Monitor stock level changes
  useEffect(() => {
    if (!stockData?.success || !enabled) return;

    const currentStockLevels = new Map<string, number>();
    const newAlerts: StockAlert[] = [];

    // Initialize on first load
    if (!isInitializedRef.current) {
      stockData.data.stockLevels.forEach((item) => {
        previousStockLevelsRef.current.set(item._id, item.currentQuantity);
      });
      isInitializedRef.current = true;
      return; // Skip alert generation on first load
    }

    stockData.data.stockLevels.forEach((item) => {
      const { _id, name, currentQuantity, minStockLevel, metric } = item;
      const previousQuantity = previousStockLevelsRef.current.get(_id);

      currentStockLevels.set(_id, currentQuantity);

      // Skip if this is the first time we're seeing this item
      if (previousQuantity === undefined) return;

      // Check for stock level changes
      const wasOutOfStock = previousQuantity === 0;
      const isNowOutOfStock = currentQuantity === 0;
      const wasLowStock =
        previousQuantity <= minStockLevel && previousQuantity > 0;
      const isNowLowStock =
        currentQuantity <= minStockLevel && currentQuantity > 0;
      const wasInStock = previousQuantity > minStockLevel;
      const isNowInStock = currentQuantity > minStockLevel;

      // Out of stock alert
      if (!wasOutOfStock && isNowOutOfStock) {
        const alert: StockAlert = {
          productId: _id,
          productName: name,
          currentQuantity,
          minStockLevel,
          metric,
          alertType: "out-of-stock",
          timestamp: new Date(),
        };
        newAlerts.push(alert);
        showToastAlert(alert);
      }
      // Low stock alert (only if it wasn't already low stock)
      else if (!wasLowStock && !wasOutOfStock && isNowLowStock) {
        const alert: StockAlert = {
          productId: _id,
          productName: name,
          currentQuantity,
          minStockLevel,
          metric,
          alertType: "low-stock",
          timestamp: new Date(),
        };
        newAlerts.push(alert);
        showToastAlert(alert);
      }
      // Restocked alert (from out of stock or low stock to in stock)
      else if ((wasOutOfStock || wasLowStock) && isNowInStock) {
        const alert: StockAlert = {
          productId: _id,
          productName: name,
          currentQuantity,
          minStockLevel,
          metric,
          alertType: "restocked",
          timestamp: new Date(),
        };
        newAlerts.push(alert);
        showToastAlert(alert);
      }
    });

    // Update previous stock levels using ref (no re-render)
    previousStockLevelsRef.current = currentStockLevels;

    // Add new alerts
    if (newAlerts.length > 0) {
      newAlerts.forEach(addAlert);
    }
  }, [stockData, enabled, addAlert, showToastAlert]);

  const clearAlerts = useCallback(() => {
    setStockAlerts([]);
  }, []);

  const getAlertsByType = useCallback(
    (type: StockAlert["alertType"]) => {
      return stockAlerts.filter((alert) => alert.alertType === type);
    },
    [stockAlerts]
  );

  const getAlertsForProduct = useCallback(
    (productId: string) => {
      return stockAlerts.filter((alert) => alert.productId === productId);
    },
    [stockAlerts]
  );

  return {
    stockAlerts,
    clearAlerts,
    getAlertsByType,
    getAlertsForProduct,
    isMonitoring: enabled && !isLoading && !error,
    error,
  };
}
