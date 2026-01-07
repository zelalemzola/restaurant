"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    type:
      activeTab === "low-stock"
        ? "low_stock"
        : activeTab === "system"
        ? "system"
        : undefined,
    userId: "system", // Explicitly set userId
  });

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  // Safely extract notifications array
  const notifications =
    notificationsResponse?.success &&
    Array.isArray(notificationsResponse.data?.notifications)
      ? notificationsResponse.data.notifications
      : [];

  const unreadCount = notificationsResponse?.success
    ? notificationsResponse.data.unreadCount ||
      notifications.filter((n) => n && !n.read).length
    : 0;

  const handleMarkAsRead = async (id: string, read: boolean) => {
    try {
      await markAsRead({ id, read }).unwrap();
      toast({
        title: "Success",
        description: `Notification marked as ${read ? "read" : "unread"}`,
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
      case "low_stock":
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case "system":
        return <Bell className="h-5 w-5 text-blue-500" />;
      case "inventory_updated":
        return <Bell className="h-5 w-5 text-green-500" />;
      case "cost_created":
      case "cost_updated":
        return <Bell className="h-5 w-5 text-purple-500" />;
      case "product_created":
      case "product_updated":
        return <Bell className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationBadgeVariant = (type: string, priority?: string) => {
    if (priority === "high" || type === "low_stock") {
      return "destructive" as const;
    }
    switch (type) {
      case "low_stock":
        return "destructive" as const;
      case "system":
        return "default" as const;
      case "inventory_updated":
        return "secondary" as const;
      case "cost_created":
      case "cost_updated":
        return "outline" as const;
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
            <p className="text-lg text-red-600 mb-4">
              Failed to load notifications
            </p>
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
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
          <TabsTrigger value="low-stock">
            Low Stock (
            {Array.isArray(notifications)
              ? notifications.filter((n) => n && n.type === "low_stock").length
              : 0}
            )
          </TabsTrigger>
          <TabsTrigger value="system">
            System (
            {Array.isArray(notifications)
              ? notifications.filter((n) => n && n.type === "system").length
              : 0}
            )
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No notifications
                  </h3>
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
                    !notification.read
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
                            <Badge
                              variant={getNotificationBadgeVariant(
                                notification.type,
                                notification.priority
                              )}
                            >
                              {notification.type.replace("_", " ")}
                            </Badge>
                            {!notification.read && (
                              <Badge variant="outline" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="text-sm">
                            {formatDistanceToNow(
                              new Date(notification.createdAt),
                              {
                                addSuffix: true,
                              }
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleMarkAsRead(
                              notification._id,
                              !notification.read
                            )
                          }
                          title={
                            notification.read
                              ? "Mark as unread"
                              : "Mark as read"
                          }
                        >
                          {notification.read ? (
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
                    {notification.type === "low_stock" &&
                      notification.data?.productId && (
                        <div className="flex gap-2 mt-2">
                          <Link href="/dashboard/inventory/stock-levels">
                            <Button variant="outline" size="sm">
                              View Stock Levels
                            </Button>
                          </Link>
                          <Link
                            href={`/dashboard/inventory/products?productId=${notification.data.productId}`}
                          >
                            <Button variant="outline" size="sm">
                              Manage Product
                            </Button>
                          </Link>
                          {notification.data.urgencyLevel === "critical" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                // This could trigger a restock dialog
                                toast({
                                  title: "Restock Required",
                                  description: `${notification.data.productName} needs immediate restocking`,
                                  variant: "destructive",
                                });
                              }}
                            >
                              Urgent Restock
                            </Button>
                          )}
                        </div>
                      )}
                    {notification.type === "inventory_updated" && (
                      <div className="flex gap-2 mt-2">
                        <Link href="/dashboard/inventory/stock-levels">
                          <Button variant="outline" size="sm">
                            View Inventory
                          </Button>
                        </Link>
                      </div>
                    )}
                    {(notification.type === "cost_created" ||
                      notification.type === "cost_updated") && (
                      <div className="flex gap-2 mt-2">
                        <Link href="/costs">
                          <Button variant="outline" size="sm">
                            View Costs
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
