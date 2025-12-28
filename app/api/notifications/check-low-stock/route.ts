// Manual low stock check API route (for testing and manual triggers)
import { NextRequest, NextResponse } from "next/server";
import { checkAndCreateLowStockNotifications } from "@/lib/utils/notifications";

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

// POST /api/notifications/check-low-stock - Manually check for low stock and create notifications
export async function POST(request: NextRequest) {
  try {
    const result = await checkAndCreateLowStockNotifications();

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error checking low stock:", error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "LOW_STOCK_CHECK_ERROR",
        message: "Failed to check for low stock items",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
