// Notifications API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Notification, Product } from "@/lib/models";
import { z } from "zod";

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

const createNotificationSchema = z.object({
  type: z.enum(["low-stock", "system", "alert"]),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  productId: z.string().optional(),
});

// GET /api/notifications - Get all notifications
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const type = searchParams.get("type");

    const filter: any = {};
    if (unreadOnly) {
      filter.isRead = false;
    }
    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter)
      .populate("productId", "name type metric currentQuantity minStockLevel")
      .sort({ createdAt: -1 })
      .limit(100);

    const response: ApiResponse<typeof notifications> = {
      success: true,
      data: notifications,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching notifications:", error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Failed to fetch notifications",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createNotificationSchema.parse(body);

    await connectDB();

    // If it's a low-stock notification, verify the product exists
    if (validatedData.type === "low-stock" && validatedData.productId) {
      const product = await Product.findById(validatedData.productId);
      if (!product) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: "PRODUCT_NOT_FOUND",
            message: "Product not found",
          },
        };
        return NextResponse.json(response, { status: 404 });
      }
    }

    const notification = new Notification(validatedData);
    await notification.save();

    // Populate product details if it's a low-stock notification
    if (notification.productId) {
      await notification.populate(
        "productId",
        "name type metric currentQuantity minStockLevel"
      );
    }

    const response: ApiResponse<typeof notification> = {
      success: true,
      data: notification,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating notification:", error);

    if (error instanceof z.ZodError) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error.issues,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "CREATE_ERROR",
        message: "Failed to create notification",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
