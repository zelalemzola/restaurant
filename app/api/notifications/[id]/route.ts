// Individual notification API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Notification } from "@/lib/models";

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

// PATCH /api/notifications/[id] - Mark notification as read/unread
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isRead } = body;

    if (typeof isRead !== "boolean") {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "isRead must be a boolean value",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    await connectDB();

    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead },
      { new: true }
    ).populate("productId", "name type metric currentQuantity minStockLevel");

    if (!notification) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: "Notification not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<typeof notification> = {
      success: true,
      data: notification,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating notification:", error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "UPDATE_ERROR",
        message: "Failed to update notification",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: "Notification not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<{ id: string }> = {
      success: true,
      data: { id },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error deleting notification:", error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "DELETE_ERROR",
        message: "Failed to delete notification",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
