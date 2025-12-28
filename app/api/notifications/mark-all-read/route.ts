// Mark all notifications as read API route
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

// PATCH /api/notifications/mark-all-read - Mark all notifications as read
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    const result = await Notification.updateMany(
      { isRead: false },
      { isRead: true }
    );

    const response: ApiResponse<{ modifiedCount: number }> = {
      success: true,
      data: { modifiedCount: result.modifiedCount },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "UPDATE_ERROR",
        message: "Failed to mark all notifications as read",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
