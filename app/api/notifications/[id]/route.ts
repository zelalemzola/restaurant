import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/services/NotificationService";
import mongoose from "mongoose";

export const runtime = "nodejs";

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

// PATCH /api/notifications/[id] - Update notification (mark as read/unread)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { read } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid notification ID",
          },
        },
        { status: 400 }
      );
    }

    if (typeof read !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_DATA",
            message: "Read status must be a boolean",
          },
        },
        { status: 400 }
      );
    }

    const success = read
      ? await notificationService.markAsRead(id)
      : await notificationService.markAsUnread(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTIFICATION_NOT_FOUND",
            message: "Notification not found",
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: `Notification marked as ${read ? "read" : "unread"}` },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Notification PATCH error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOTIFICATION_UPDATE_ERROR",
          message: "Failed to update notification",
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/[id] - Mark notification as read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid notification ID",
          },
        },
        { status: 400 }
      );
    }

    const success = await notificationService.markAsRead(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTIFICATION_NOT_FOUND",
            message: "Notification not found or already read",
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Notification marked as read" },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Notification PUT error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOTIFICATION_UPDATE_ERROR",
          message: "Failed to update notification",
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ID",
            message: "Invalid notification ID",
          },
        },
        { status: 400 }
      );
    }

    const success = await notificationService.deleteNotification(id);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOTIFICATION_NOT_FOUND",
            message: "Notification not found",
          },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Notification deleted successfully" },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Notification DELETE error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "NOTIFICATION_DELETE_ERROR",
          message: "Failed to delete notification",
        },
      },
      { status: 500 }
    );
  }
}
