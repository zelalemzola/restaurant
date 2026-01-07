// Cost Expenses API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CostExpense from "@/lib/models/CostExpense";
import { costExpenseService } from "@/lib/services/costExpenseService";

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

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const productId = searchParams.get("productId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (
      category &&
      ["inventory", "operational", "overhead"].includes(category)
    ) {
      query.category = category;
    }

    if (productId) {
      query.productId = productId;
    }

    // Date range filtering
    if (startDate || endDate) {
      query.recordedAt = {};
      if (startDate) {
        query.recordedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.recordedAt.$lte = new Date(endDate);
      }
    }

    // Get cost expenses with pagination
    const [costExpenses, total] = await Promise.all([
      CostExpense.find(query)
        .populate("productId", "name type")
        .sort({ recordedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CostExpense.countDocuments(query),
    ]);

    const response: ApiResponse<{
      costExpenses: typeof costExpenses;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        costExpenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching cost expenses:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Failed to fetch cost expenses",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, costPrice, quantity, category, updatedBy, reason } =
      body;

    // Validate required fields
    if (!productId || costPrice === undefined || quantity === undefined) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "productId, costPrice, and quantity are required",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Record cost as expense
    const costExpense = await costExpenseService.recordCostAsExpense(
      productId,
      costPrice,
      quantity,
      {
        category: category || "inventory",
        updatedBy,
        reason,
      }
    );

    const response: ApiResponse<typeof costExpense> = {
      success: true,
      data: costExpense,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating cost expense:", error);

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "CREATE_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create cost expense",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
