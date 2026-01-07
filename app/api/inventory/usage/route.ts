// Stock usage recording API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Product, StockTransaction } from "@/lib/models";
import { checkProductLowStock } from "@/lib/utils/notifications";
import {
  withAuthAndPermissions,
  auditSuccess,
  auditFailure,
} from "@/lib/middleware/audit-rbac";
import { auditStockTransaction } from "@/lib/utils/audit";
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

const usageSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().positive("Quantity must be positive"),
  reason: z.string().optional(),
});

const bulkUsageSchema = z.object({
  items: z.array(usageSchema).min(1, "At least one item is required"),
});

export async function POST(request: NextRequest) {
  // Check authentication and permissions
  const { user, error } = await withAuthAndPermissions(request, [
    "inventory.update",
  ]);
  if (error) return error;

  try {
    const body = await request.json();

    // Check if it's a bulk usage request or single item
    const isBulkRequest = Array.isArray(body.items);

    if (isBulkRequest) {
      return handleBulkUsage(body, { user, request });
    } else {
      return handleSingleUsage(body, { user, request });
    }
  } catch (error) {
    // Audit failed operation
    await auditFailure(
      { user, request },
      "STOCK_USAGE",
      "STOCK_TRANSACTION",
      undefined,
      {
        operation: "record_stock_usage",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      error instanceof Error ? error.message : "Unknown error"
    );

    console.error("Error recording stock usage:", error);

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
        code: "USAGE_ERROR",
        message: "Failed to record stock usage",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

async function handleSingleUsage(
  body: any,
  context: { user: any; request: NextRequest }
) {
  const { user, request } = context;
  const validatedData = usageSchema.parse(body);
  const { productId, quantity, reason } = validatedData;

  await connectDB();

  // Verify product exists and has stock tracking enabled
  const product = await Product.findById(productId);
  if (!product) {
    await auditFailure(
      context,
      "STOCK_USAGE",
      "STOCK_TRANSACTION",
      productId,
      {
        operation: "single_stock_usage",
        productId,
        error: "Product not found",
      },
      "Product not found"
    );

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
    await auditFailure(
      context,
      "STOCK_USAGE",
      "STOCK_TRANSACTION",
      productId,
      {
        operation: "single_stock_usage",
        productId,
        productType: product.type,
        error: "Stock tracking disabled for product",
      },
      "Stock tracking is disabled for this product"
    );

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "STOCK_TRACKING_DISABLED",
        message: "Stock tracking is disabled for this product",
      },
    };
    return NextResponse.json(response, { status: 400 });
  }

  // Check if there's sufficient stock
  if (product.currentQuantity < quantity) {
    await auditFailure(
      context,
      "STOCK_USAGE",
      "STOCK_TRANSACTION",
      productId,
      {
        operation: "single_stock_usage",
        productId,
        productName: product.name,
        available: product.currentQuantity,
        requested: quantity,
        error: "Insufficient stock",
      },
      `Insufficient stock. Available: ${product.currentQuantity}, Requested: ${quantity}`
    );

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient stock. Available: ${product.currentQuantity} ${product.metric}, Requested: ${quantity} ${product.metric}`,
        details: {
          available: product.currentQuantity,
          requested: quantity,
          metric: product.metric,
        },
      },
    };
    return NextResponse.json(response, { status: 400 });
  }

  const previousQuantity = product.currentQuantity;
  const newQuantity = previousQuantity - quantity;

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
      type: "usage",
      quantity: -quantity, // Negative for usage
      previousQuantity,
      newQuantity,
      reason: reason || "Stock usage recorded",
      userId: new mongoose.Types.ObjectId(user.id),
    });

    await stockTransaction.save({ session });

    await session.commitTransaction();

    // Audit successful stock usage
    await auditStockTransaction(
      user.id,
      user.email,
      "STOCK_USAGE",
      productId,
      {
        productName: product.name,
        quantity,
        previousQuantity,
        newQuantity,
        reason: reason || "Stock usage recorded",
      },
      request
    );

    // Check for low stock after the transaction is committed
    await checkProductLowStock(productId);

    // Populate the transaction with product details
    await stockTransaction.populate("productId", "name type metric");

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
}

async function handleBulkUsage(
  body: any,
  context: { user: any; request: NextRequest }
) {
  const { user, request } = context;
  const validatedData = bulkUsageSchema.parse(body);
  const { items } = validatedData;

  await connectDB();

  // Verify all products exist and have stock tracking enabled
  const productIds = items.map((item) => item.productId);
  const products = await Product.find({
    _id: { $in: productIds },
    stockTrackingEnabled: { $ne: false }, // Only include products with stock tracking enabled
  });

  if (products.length !== productIds.length) {
    await auditFailure(
      context,
      "STOCK_USAGE",
      "STOCK_TRANSACTION",
      undefined,
      {
        operation: "bulk_stock_usage",
        requestedProducts: productIds.length,
        foundProducts: products.length,
        error: "Products not found or stock tracking disabled",
      },
      "One or more products not found or have stock tracking disabled"
    );

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "INVALID_PRODUCTS",
        message: "One or more products not found or invalid for stock usage",
      },
    };
    return NextResponse.json(response, { status: 400 });
  }

  // Check stock availability for all items
  const insufficientStockItems = [];
  for (const item of items) {
    const product = products.find((p) => p._id.toString() === item.productId);
    if (product && product.currentQuantity < item.quantity) {
      insufficientStockItems.push({
        productId: item.productId,
        productName: product.name,
        available: product.currentQuantity,
        requested: item.quantity,
        metric: product.metric,
      });
    }
  }

  if (insufficientStockItems.length > 0) {
    await auditFailure(
      context,
      "STOCK_USAGE",
      "STOCK_TRANSACTION",
      undefined,
      {
        operation: "bulk_stock_usage",
        insufficientStockItems,
        error: "Insufficient stock for bulk usage",
      },
      "Insufficient stock for one or more items"
    );

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "INSUFFICIENT_STOCK",
        message: "Insufficient stock for one or more items",
        details: insufficientStockItems,
      },
    };
    return NextResponse.json(response, { status: 400 });
  }

  // Start a transaction to ensure data consistency
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transactions = [];
    const auditDetails = [];

    for (const item of items) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) continue;

      const previousQuantity = product.currentQuantity;
      const newQuantity = previousQuantity - item.quantity;

      // Update product quantity
      await Product.findByIdAndUpdate(
        item.productId,
        { currentQuantity: newQuantity },
        { session }
      );

      // Create stock transaction record
      const stockTransaction = new StockTransaction({
        productId: item.productId,
        type: "usage",
        quantity: -item.quantity, // Negative for usage
        previousQuantity,
        newQuantity,
        reason: item.reason || "Bulk stock usage recorded",
        userId: new mongoose.Types.ObjectId(user.id),
      });

      await stockTransaction.save({ session });
      transactions.push(stockTransaction);

      // Collect audit details
      auditDetails.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        previousQuantity,
        newQuantity,
        reason: item.reason || "Bulk stock usage recorded",
      });
    }

    // Populate all transactions with product details
    await StockTransaction.populate(transactions, {
      path: "productId",
      select: "name type metric",
    });

    await session.commitTransaction();

    // Audit successful bulk stock usage
    await auditSuccess(context, "STOCK_USAGE", "STOCK_TRANSACTION", undefined, {
      operation: "bulk_stock_usage",
      itemCount: items.length,
      items: auditDetails,
    });

    // Check for low stock for all affected products after the transaction is committed
    for (const item of items) {
      await checkProductLowStock(item.productId);
    }

    const response: ApiResponse<typeof transactions> = {
      success: true,
      data: transactions,
    };

    return NextResponse.json(response);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
