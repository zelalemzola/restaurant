"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Bell, CheckCircle, Trash2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} from "@/lib/store/api";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export default function NotificationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch notifications based on active tab
  const {
    data: notificationsResponse,
    isLoading,
    error,
    refetch,
  } = useGetNotificationsQuery({
    unreadOnly: activeTab === "unread",
    type: activeTab === "low-stock" ? "low-stock" : undefined,
  });

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = notificationsResponse?.success ? notificationsResponse.data : [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    try {
      await markAsRead({ id, isRead }).unwrap();
      toast({
        title: "Success",
        description: `Notification marked as ${isRead ? "read" : "unread"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const result = await markAllAsRead().unwrap();
      if (result.success) {
        toast({
          title: "Success",
          description: `${result.data.modifiedCount} notifications marked as read`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id).unwrap();
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "low-stock":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "system":
        return <Bell className="h-5 w-5 text-blue-500" />;
      case "alert":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case "low-stock":
        return "secondary" as const;
      case "system":
        return "default" as const;
      case "alert":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-lg">Loading notifications...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg text-red-600 mb-4">Failed to load notifications</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Stay updated with system alerts and low stock warnings
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read ({unreadCount})
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            All ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread ({unreadCount})
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            Low Stock ({notifications.filter((n) => n.type === "low-stock").length})
          </TabsTrigger>
          <TabsTrigger value="system">
            System ({notifications.filter((n) => n.type === "system").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "unread"
                      ? "You're all caught up! No unread notifications."
                      : "No notifications to display."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification._id}
                  className={`transition-all ${
                    !notification.isRead
                      ? "border-l-4 border-l-blue-500 bg-blue-50/50"
                      : "hover:shadow-md"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">
                              {notification.title}
                            </CardTitle>
                            <Badge variant={getNotificationBadgeVariant(notification.type)}>
                              {notification.type.replace("-", " ")}
                            </Badge>
                            {!notification.isRead && (
                              <Badge variant="outline" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleMarkAsRead(notification._id, !notification.isRead)
                          }
                          title={notification.isRead ? "Mark as unread" : "Mark as read"}
                        >
                          {notification.isRead ? (
                            <Mail className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification._id)}
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      {notification.message}
                    </p>
                    {notification.type === "low-stock" && notification.productId && (
                      <div className="flex gap-2">
                        <Link href="/dashboard/inventory/stock-levels">
                          <Button variant="outline" size="sm">
                            View Stock Levels
                          </Button>
                        </Link>
                        <Link href="/dashboard/inventory/products">
                          <Button variant="outline" size="sm">
                            Manage Products
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}