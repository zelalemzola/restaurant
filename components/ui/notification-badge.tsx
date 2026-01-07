"use client";

import { Bell, AlertTriangle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationPolling } from "@/hooks/use-notification-polling";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  className?: string;
  showCriticalIndicator?: boolean;
}

export function NotificationBadge({
  className,
  showCriticalIndicator = true,
}: NotificationBadgeProps) {
  const { notifications, unreadCount } = useNotificationPolling({
    enabled: true,
    interval: 30000, // Poll every 30 seconds
  });

  // Ensure unreadCount is always a valid number
  const safeUnreadCount =
    typeof unreadCount === "number" && !isNaN(unreadCount) && unreadCount >= 0
      ? unreadCount
      : 0;

  // Check for critical notifications (high priority or low stock critical)
  const hasCriticalNotifications =
    Array.isArray(notifications) &&
    notifications.some(
      (notification) =>
        notification &&
        !notification.read &&
        (notification.priority === "high" ||
          (notification.type === "low_stock" &&
            notification.data?.urgencyLevel === "critical"))
    );

  // Get the appropriate icon based on notification status
  const getNotificationIcon = () => {
    if (hasCriticalNotifications && showCriticalIndicator) {
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
    return <Bell className="h-5 w-5" />;
  };

  // Get badge variant based on notification urgency
  const getBadgeVariant = () => {
    if (hasCriticalNotifications) {
      return "destructive" as const;
    }
    return "default" as const;
  };

  return (
    <Link href="/dashboard/notifications">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "relative",
          hasCriticalNotifications && "animate-pulse",
          className
        )}
      >
        {getNotificationIcon()}
        {safeUnreadCount > 0 && (
          <Badge
            variant={getBadgeVariant()}
            className={cn(
              "absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs",
              hasCriticalNotifications && "animate-pulse"
            )}
          >
            {safeUnreadCount > 99 ? "99+" : safeUnreadCount}
          </Badge>
        )}
        <span className="sr-only">
          {safeUnreadCount > 0
            ? `${safeUnreadCount} unread notifications${
                hasCriticalNotifications ? " (critical alerts)" : ""
              }`
            : "No unread notifications"}
        </span>
      </Button>
    </Link>
  );
}
