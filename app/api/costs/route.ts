// Cost Operations API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { CostOperation } from "@/lib/models";
import { createCostOperationSchema } from "@/lib/validations";

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
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (
      category &&
      ["rent", "salary", "utilities", "maintenance", "other"].includes(category)
    ) {
      query.category = category;
    }

    if (type && ["recurring", "one-time"].includes(type)) {
      query.type = type;
    }

    // Date range filtering
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Get cost operations with pagination
    const [costOperations, total] = await Promise.all([
      CostOperation.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CostOperation.countDocuments(query),
    ]);

    const response: ApiResponse<{
      costOperations: typeof costOperations;
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        costOperations,
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
    console.error("Error fetching cost operations:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Failed to fetch cost operations",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Convert date string to Date object if needed
    if (body.date && typeof body.date === "string") {
      body.date = new Date(body.date);
    }

    // Validate request body
    const validatedData = createCostOperationSchema.parse(body);

    await connectDB();

    // For now, use a placeholder userId - this will be replaced with actual user from session
    const costOperation = new CostOperation({
      ...validatedData,
      userId: "507f1f77bcf86cd799439011", // Placeholder ObjectId
    });

    await costOperation.save();

    const response: ApiResponse<typeof costOperation> = {
      success: true,
      data: costOperation,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating cost operation:", error);

    if (error instanceof Error && error.name === "ZodError") {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details: error,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "CREATE_ERROR",
        message: "Failed to create cost operation",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
