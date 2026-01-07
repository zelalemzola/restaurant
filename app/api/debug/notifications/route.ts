import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/services/NotificationService";
import { lowStockMonitor } from "@/lib/services/lowStockMonitor";

export const runtime = "nodejs";

// GET /api/debug/notifications - Debug notifications
export async function GET(request: NextRequest) {
  try {
    // Get all notifications
    const allNotifications = await notificationService.getNotifications(
      "system",
      { limit: 100 }
    );

    // Get low stock items
    const lowStockItems = await lowStockMonitor.getLowStockItems();

    // Get active low stock notifications
    const activeLowStockNotifications =
      await notificationService.getActiveLowStockNotifications();

    // Get unread count
    const unreadCount = await notificationService.getUnreadCount("system");

    return NextResponse.json({
      success: true,
      debug: {
        totalNotifications: allNotifications.length,
        unreadCount,
        lowStockItems: lowStockItems.length,
        activeLowStockNotifications: activeLowStockNotifications.length,
        notifications: allNotifications.map((n) => ({
          id: n._id,
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          priority: n.priority,
          category: n.category,
          createdAt: n.createdAt,
          data: n.data,
        })),
        lowStockDetails: lowStockItems.map((item) => ({
          id: item._id,
          name: item.name,
          currentQuantity: item.currentQuantity,
          minStockLevel: item.minStockLevel,
          urgencyLevel: item.urgencyLevel,
        })),
      },
    });
  } catch (error) {
    console.error("Debug notifications error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DEBUG_ERROR",
          message: "Failed to get debug info",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
