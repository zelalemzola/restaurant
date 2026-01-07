// Stock adjustment API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Product, StockTransaction } from "@/lib/models";
import { checkProductLowStock } from "@/lib/utils/notifications";
import mongoose from "mongoose";
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

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  newQuantity: z.number().min(0, "Quantity must be non-negative"),
  reason: z.string().min(1, "Reason is required").max(500, "Reason too long"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = adjustmentSchema.parse(body);
    const { productId, newQuantity, reason } = validatedData;

    await connectDB();

    // Verify product exists and has stock tracking enabled
    const product = await Product.findById(productId);
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

    // Check if stock tracking is enabled for this product
    if (product.stockTrackingEnabled === false) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "STOCK_TRACKING_DISABLED",
          message: "Stock tracking is disabled for this product",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const previousQuantity = product.currentQuantity;
    const quantityDifference = newQuantity - previousQuantity;

    // Start a transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update product quantity
      await Product.findByIdAndUpdate(
        productId,
        { currentQuantity: newQuantity },
        { session }
      );

      // Create stock transaction record
      const stockTransaction = new StockTransaction({
        productId,
        type: "adjustment",
        quantity: quantityDifference, // Can be positive or negative
        previousQuantity,
        newQuantity,
        reason,
        userId: new mongoose.Types.ObjectId("000000000000000000000000"), // Temporary user ID
      });

      await stockTransaction.save({ session });

      // Populate the transaction with product details
      await stockTransaction.populate("productId", "name type metric");

      await session.commitTransaction();

      // Check for low stock after the transaction is committed
      await checkProductLowStock(productId);

      const response: ApiResponse<typeof stockTransaction> = {
        success: true,
        data: stockTransaction,
      };

      return NextResponse.json(response);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("Error adjusting stock:", error);

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
        code: "ADJUSTMENT_ERROR",
        message: "Failed to adjust stock",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
