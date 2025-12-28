"use client";

import { useEffect, useRef } from "react";
import { useGetNotificationsQuery } from "@/lib/store/api";

interface UseNotificationPollingOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
}

/**
 * Hook for polling notifications at regular intervals
 * This provides real-time updates for notifications
 */
export function useNotificationPolling({
  enabled = true,
  interval = 30000, // 30 seconds default
}: UseNotificationPollingOptions = {}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data: notificationsResponse,
    isLoading,
    error,
    refetch,
  } = useGetNotificationsQuery(
    { unreadOnly: false },
    {
      // Enable polling with RTK Query
      pollingInterval: enabled ? interval : 0,
      // Skip if disabled
      skip: !enabled,
    }
  );

  const notifications = notificationsResponse?.success
    ? notificationsResponse.data
    : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Manual polling fallback (in case RTK Query polling doesn't work as expected)
  useEffect(() => {
    if (!enabled) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up manual polling as backup
    intervalRef.current = setInterval(() => {
      refetch();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refetch,
  };
}
