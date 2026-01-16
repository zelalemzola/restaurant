import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/services/NotificationService";
import { z } from "zod";

export const runtime = "nodejs";

// Validation schemas
const createNotificationSchema = z.object({
  type: z.enum([
    "product_created",
    "product_updated",
    "product_deleted",
    "cost_created",
    "cost_updated",
    "cost_deleted",
    "inventory_updated",
    "sale_created",
    "low_stock",
    "system",
    "user_created",
    "user_updated",
    "user_deleted",
  ]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  data: z.any().optional(),
  userId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

// GET /api/notifications - Get notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "system";
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type"); // Add type filter
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    const notifications = await notificationService.getNotifications(userId, {
      unreadOnly,
      type: type || undefined, // Pass type filter
      category: category || undefined,
      limit,
      skip,
    });

    const unreadCount = await notificationService.getUnreadCount(userId);

    const response: ApiResponse<{
      notifications: any[];
      unreadCount: number;
      pagination: {
        limit: number;
        skip: number;
        total: number;
      };
    }> = {
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          limit,
          skip,
          total: notifications.length,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOTIFICATIONS_FETCH_ERROR",
          message: "Failed to fetch notifications",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = createNotificationSchema.parse(body);

    const notification = await notificationService.createNotification({
      type: validatedData.type,
      title: validatedData.title,
      message: validatedData.message,
      data: validatedData.data,
      userId: validatedData.userId,
      priority: validatedData.priority,
      category: validatedData.category,
      expiresAt: validatedData.expiresAt
        ? new Date(validatedData.expiresAt)
        : undefined,
    });

    if (!notification) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTIFICATION_CREATE_ERROR",
            message: "Failed to create notification",
          },
        },
        { status: 500 }
      );
    }

    const response: ApiResponse<typeof notification> = {
      success: true,
      data: notification,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: error,
          },
        },
        { status: 400 }
      );
    }

    console.error("Notification POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOTIFICATION_CREATE_ERROR",
          message: "Failed to create notification",
        },
      },
      { status: 500 }
    );
  }
}
