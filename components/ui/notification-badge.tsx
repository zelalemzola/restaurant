"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNotificationPolling } from "@/hooks/use-notification-polling";
import Link from "next/link";

interface NotificationBadgeProps {
  className?: string;
}

export function NotificationBadge({ className }: NotificationBadgeProps) {
  const { unreadCount } = useNotificationPolling({
    enabled: true,
    interval: 30000, // Poll every 30 seconds
  });

  return (
    <Link href="/dashboard/notifications">
      <Button variant="ghost" size="sm" className={`relative ${className}`}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
        <span className="sr-only">
          {unreadCount > 0 ? `${unreadCount} unread notifications` : "No unread notifications"}
        </span>
      </Button>
    </Link>
  );
}