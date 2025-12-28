// Individual Cost Operation API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { CostOperation } from "@/lib/models";
import { createCostOperationSchema } from "@/lib/validations";
import mongoose from "mongoose";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid cost operation ID",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    await connectDB();

    const costOperation = await CostOperation.findById(id);
    if (!costOperation) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Cost operation not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<typeof costOperation> = {
      success: true,
      data: costOperation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching cost operation:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Failed to fetch cost operation",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid cost operation ID",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await request.json();

    // Convert date string to Date object if needed
    if (body.date && typeof body.date === "string") {
      body.date = new Date(body.date);
    }

    // Validate request body
    const validatedData = createCostOperationSchema.parse(body);

    await connectDB();

    const costOperation = await CostOperation.findByIdAndUpdate(
      id,
      validatedData,
      { new: true, runValidators: true }
    );

    if (!costOperation) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Cost operation not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<typeof costOperation> = {
      success: true,
      data: costOperation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating cost operation:", error);

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
        code: "UPDATE_ERROR",
        message: "Failed to update cost operation",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "INVALID_ID",
          message: "Invalid cost operation ID",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    await connectDB();

    const costOperation = await CostOperation.findByIdAndDelete(id);
    if (!costOperation) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Cost operation not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Cost operation deleted successfully" },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error deleting cost operation:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "DELETE_ERROR",
        message: "Failed to delete cost operation",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
