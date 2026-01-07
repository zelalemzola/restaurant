// Individual Product API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Product, ProductGroup } from "@/lib/models";
import { createProductSchema } from "@/lib/validations";
import { eventBroadcaster } from "@/lib/services/eventBroadcaster";
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
          message: "Invalid product ID",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    await connectDB();

    const product = await Product.findById(id).populate(
      "groupId",
      "name description"
    );

    if (!product) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Product not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<typeof product> = {
      success: true,
      data: product,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching product:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Failed to fetch product",
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
          message: "Invalid product ID",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const body = await request.json();

    // Create a partial schema for updates (all fields optional)
    const updateSchema = createProductSchema.partial();

    // Validate request body
    const validatedData = updateSchema.parse(body);

    await connectDB();

    // Check if product exists
    const existingProduct = await Product.findById(id);
    if (!existingProduct) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Product not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // If groupId is being updated, verify the new group exists
    if (
      validatedData.groupId &&
      validatedData.groupId !== existingProduct.groupId.toString()
    ) {
      const productGroup = await ProductGroup.findById(validatedData.groupId);
      if (!productGroup) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: "INVALID_GROUP",
            message: "Product group not found",
          },
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Check for duplicate name in the same group (if name or groupId is being updated)
    if (validatedData.name || validatedData.groupId) {
      const nameToCheck = validatedData.name || existingProduct.name;
      const groupToCheck = validatedData.groupId || existingProduct.groupId;

      const duplicateProduct = await Product.findOne({
        name: nameToCheck,
        groupId: groupToCheck,
        _id: { $ne: id },
      });

      if (duplicateProduct) {
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: "DUPLICATE_NAME",
            message:
              "Product with this name already exists in the selected group",
          },
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Remove any _id field from update data if it exists
    const updateData = { ...validatedData };
    if ("_id" in updateData) {
      delete (updateData as any)._id;
    }

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("groupId", "name description");

    // Broadcast real-time update
    eventBroadcaster.broadcastProductUpdated(product?.toObject());

    const response: ApiResponse<typeof product> = {
      success: true,
      data: product,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating product:", error);

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
        message: "Failed to update product",
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
          message: "Invalid product ID",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    await connectDB();

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Product not found",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Broadcast real-time update
    eventBroadcaster.broadcastProductDeleted(id);

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Product deleted successfully" },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error deleting product:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "DELETE_ERROR",
        message: "Failed to delete product",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
