"use client";

import { useEffect, useRef } from "react";
import { useGetNotificationsQuery } from "@/lib/store/api";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import {
  notificationReceived,
  notificationUpdated,
} from "@/lib/store/slices/notificationsSlice";
import { useEventBroadcaster } from "@/lib/services/eventBroadcaster";

interface UseNotificationPollingOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
}

/**
 * Hook for polling notifications at regular intervals with real-time updates
 * This provides real-time updates for notifications through both polling and event broadcasting
 */
export function useNotificationPolling({
  enabled = true,
  interval = 30000, // 30 seconds default
}: UseNotificationPollingOptions = {}) {
  const dispatch = useAppDispatch();
  const eventBroadcaster = useEventBroadcaster();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get notifications from Redux store
  const reduxNotifications = useAppSelector(
    (state) => state.notifications.items
  );
  const reduxUnreadCount = useAppSelector(
    (state) => state.notifications.unreadCount
  );
  const lastUpdated = useAppSelector(
    (state) => state.notifications.lastUpdated
  );

  const {
    data: notificationsResponse,
    isLoading,
    error,
    refetch,
  } = useGetNotificationsQuery(
    { unreadOnly: false, userId: "system" },
    {
      // Enable polling with RTK Query
      pollingInterval: enabled ? interval : 0,
      // Skip if disabled
      skip: !enabled,
    }
  );

  // Subscribe to real-time notification events
  useEffect(() => {
    if (!enabled) return;

    const handleNotificationEvent = (event: any) => {
      if (event.entity === "notification" && event.operation === "create") {
        dispatch(notificationReceived(event.data));
      }
    };

    // Subscribe to notification events
    eventBroadcaster.subscribe("notification", handleNotificationEvent);
    eventBroadcaster.subscribe("notification:create", handleNotificationEvent);

    return () => {
      eventBroadcaster.unsubscribe("notification", handleNotificationEvent);
      eventBroadcaster.unsubscribe(
        "notification:create",
        handleNotificationEvent
      );
    };
  }, [enabled, dispatch, eventBroadcaster]);

  // Safely extract notifications with comprehensive type checking
  let safeNotifications: any[] = [];
  let unreadCount = 0;

  // Prefer Redux store data if available and recent
  const useReduxData =
    reduxNotifications.length > 0 && Date.now() - lastUpdated < interval * 2; // Use Redux data if updated within 2 polling intervals

  if (useReduxData) {
    safeNotifications = reduxNotifications;
    unreadCount = reduxUnreadCount;
  } else {
    // Fallback to API response
    try {
      if (notificationsResponse?.success && notificationsResponse.data) {
        // First, try to get notifications array
        const rawNotifications = notificationsResponse.data.notifications;

        if (Array.isArray(rawNotifications)) {
          safeNotifications = rawNotifications;
        } else if (Array.isArray(notificationsResponse.data)) {
          // Fallback: if data itself is an array
          safeNotifications = notificationsResponse.data;
        } else {
          safeNotifications = [];
        }

        // Get unread count safely
        if (typeof notificationsResponse.data.unreadCount === "number") {
          unreadCount = notificationsResponse.data.unreadCount;
        } else {
          // Calculate from notifications array only if it's valid
          unreadCount = safeNotifications.filter(
            (n) => n && typeof n === "object" && !n.read
          ).length;
        }
      }
    } catch (error) {
      console.error("Error processing notifications:", error);
      safeNotifications = [];
      unreadCount = 0;
    }
  }

  // Debug logging to understand the data structure
  if (process.env.NODE_ENV === "development" && notificationsResponse) {
    console.log("Notification polling debug:", {
      success: notificationsResponse.success,
      dataType: notificationsResponse.success
        ? typeof notificationsResponse.data
        : "error",
      hasNotifications: notificationsResponse.success
        ? notificationsResponse.data?.notifications !== undefined
        : false,
      notificationsType: notificationsResponse.success
        ? typeof notificationsResponse.data?.notifications
        : "error",
      isArray: notificationsResponse.success
        ? Array.isArray(notificationsResponse.data?.notifications)
        : false,
      safeNotificationsLength: safeNotifications.length,
      unreadCount,
      useReduxData,
      reduxNotificationsLength: reduxNotifications.length,
      lastUpdated: new Date(lastUpdated).toISOString(),
    });
  }

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
    notifications: safeNotifications,
    unreadCount:
      typeof unreadCount === "number" && !isNaN(unreadCount) && unreadCount >= 0
        ? unreadCount
        : 0,
    isLoading,
    error,
    refetch,
    isRealTime: useReduxData, // Indicates if data is from real-time updates
  };
}
