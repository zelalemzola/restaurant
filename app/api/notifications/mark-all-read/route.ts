import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/services/NotificationService";

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

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "system";

    const modifiedCount = await notificationService.markAllAsRead(userId);

    const response: ApiResponse<{ modifiedCount: number }> = {
      success: true,
      data: { modifiedCount },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MARK_ALL_READ_ERROR",
          message: "Failed to mark all notifications as read",
        },
      },
      { status: 500 }
    );
  }
}
