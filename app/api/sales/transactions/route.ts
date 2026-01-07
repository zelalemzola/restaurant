// Sales transactions API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesTransaction from "@/lib/models/SalesTransaction";
import StockTransaction from "@/lib/models/StockTransaction";
import Product from "@/lib/models/Product";
import { CreateSalesTransactionRequest } from "@/types";
import {
  withAuthAndPermissions,
  auditSuccess,
  auditFailure,
} from "@/lib/middleware/audit-rbac";
import { auditSalesTransaction } from "@/lib/utils/audit";
import { eventBroadcaster } from "@/lib/services/eventBroadcaster";
import mongoose from "mongoose";

// GET /api/sales/transactions - Get sales transactions with pagination
export async function GET(request: NextRequest) {
  // Check authentication and permissions
  const { user, error } = await withAuthAndPermissions(request, ["sales.read"]);
  if (error) return error;

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await SalesTransaction.countDocuments();

    // Get sales transactions with product details
    const transactions = await SalesTransaction.find()
      .populate({
        path: "items.productId",
        select: "name type metric sellingPrice",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Audit successful read operation
    await auditSuccess(
      { user, request },
      "SALES_TRANSACTION",
      "SALES_TRANSACTION",
      undefined,
      {
        operation: "list_sales_transactions",
        resultCount: transactions.length,
        totalCount: total,
        page,
        limit,
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        data: transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    // Audit failed operation
    await auditFailure(
      { user, request },
      "SALES_TRANSACTION",
      "SALES_TRANSACTION",
      undefined,
      { operation: "list_sales_transactions" },
      error instanceof Error ? error.message : "Unknown error"
    );

    console.error("Error fetching sales transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: "Failed to fetch sales transactions",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/sales/transactions - Create new sales transaction
export async function POST(request: NextRequest) {
  // Check authentication and permissions (bypass in development for testing)
  let user: any;
  if (
    process.env.NODE_ENV === "development" &&
    request.headers.get("x-test-mode") === "true"
  ) {
    // Use a test user for development testing
    user = {
      id: "694e5814568234dcb91b4816", // Use a valid ObjectId for testing
      email: "test@example.com",
      name: "Test User",
      role: "admin",
    };
  } else {
    const { user: authUser, error } = await withAuthAndPermissions(request, [
      "sales.create",
    ]);
    if (error) return error;
    user = authUser;
  }

  const session = await mongoose.startSession();

  let items: any[] = [];
  let paymentMethod: string = "";

  try {
    await connectDB();

    const body: CreateSalesTransactionRequest = await request.json();
    ({ items, paymentMethod } = body);

    // Validate required fields
    if (!items || items.length === 0) {
      await auditFailure(
        { user, request },
        "SALES_TRANSACTION",
        "SALES_TRANSACTION",
        undefined,
        { operation: "create_sales_transaction", error: "No items provided" },
        "At least one item is required"
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "At least one item is required",
          },
        },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      await auditFailure(
        { user, request },
        "SALES_TRANSACTION",
        "SALES_TRANSACTION",
        undefined,
        {
          operation: "create_sales_transaction",
          error: "No payment method provided",
        },
        "Payment method is required"
      );

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Payment method is required",
          },
        },
        { status: 400 }
      );
    }

    let createdTransactionId: any;
    let auditDetails: any = {};
    let processedItems: any[] = []; // Move processedItems to outer scope

    await session.withTransaction(async () => {
      // Validate products and calculate totals
      processedItems = []; // Reset the array
      let totalAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId).session(session);

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Check if product can be sold
        if (product.type !== "sellable" && product.type !== "combination") {
          throw new Error(
            `Product ${product.name} cannot be sold (type: ${product.type})`
          );
        }

        // Validate selling price exists
        if (!product.sellingPrice || product.sellingPrice <= 0) {
          throw new Error(
            `Product ${product.name} does not have a valid selling price`
          );
        }

        // For sellable and combination items, check stock availability
        if (product.type === "sellable" || product.type === "combination") {
          if (product.currentQuantity < item.quantity) {
            throw new Error(
              `Insufficient stock for ${product.name}. Available: ${product.currentQuantity}, Requested: ${item.quantity}`
            );
          }
        }

        const unitPrice = product.sellingPrice;
        const totalPrice = unitPrice * item.quantity;

        processedItems.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });

        totalAmount += totalPrice;
      }

      // Create sales transaction
      const salesTransaction = new SalesTransaction({
        items: processedItems,
        totalAmount,
        paymentMethod,
        userId: new mongoose.Types.ObjectId(user.id),
      });

      await salesTransaction.save({ session });
      createdTransactionId = salesTransaction._id;

      // Prepare audit details
      auditDetails = {
        items: processedItems.map((item, index) => ({
          productId: item.productId,
          productName: (items[index] as any)?.productName || "Unknown",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount,
        paymentMethod,
      };

      // Update stock levels and create stock transactions for sellable and combination items
      for (const item of processedItems) {
        const product = await Product.findById(item.productId).session(session);

        if (
          product &&
          (product.type === "sellable" || product.type === "combination")
        ) {
          const previousQuantity = product.currentQuantity;
          const newQuantity = previousQuantity - item.quantity;

          // Update product stock
          await Product.findByIdAndUpdate(
            item.productId,
            { currentQuantity: newQuantity },
            { session }
          );

          // Create stock transaction record
          const stockTransaction = new StockTransaction({
            productId: item.productId,
            type: "sale",
            quantity: -item.quantity, // Negative for stock reduction
            previousQuantity,
            newQuantity,
            reason: `Sale transaction ${salesTransaction._id}`,
            userId: new mongoose.Types.ObjectId(user.id),
          });

          await stockTransaction.save({ session });
        }
      }
    });

    // Audit successful sales transaction
    await auditSalesTransaction(
      user.id,
      user.email,
      createdTransactionId?.toString() || "",
      auditDetails,
      request
    );

    // Fetch the created transaction with populated product details
    const createdTransaction = await SalesTransaction.findById(
      createdTransactionId
    )
      .populate({
        path: "items.productId",
        select: "name type metric sellingPrice",
      })
      .lean();

    // Broadcast real-time updates
    if (createdTransaction) {
      // Broadcast sales transaction creation
      eventBroadcaster.broadcastSaleCreated(createdTransaction, user.id);

      // Broadcast inventory updates for each product
      for (const item of processedItems) {
        const product = await Product.findById(item.productId);
        if (
          product &&
          (product.type === "sellable" || product.type === "combination")
        ) {
          eventBroadcaster.broadcastQuantityChanged(
            item.productId,
            product.currentQuantity,
            -item.quantity,
            "sale",
            user.id
          );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: createdTransaction,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Audit failed operation
    await auditFailure(
      { user, request },
      "SALES_TRANSACTION",
      "SALES_TRANSACTION",
      undefined,
      {
        operation: "create_sales_transaction",
        error: errorMessage,
        requestData: { items, paymentMethod },
      },
      errorMessage
    );

    console.error("Error creating sales transaction:", error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TRANSACTION_ERROR",
            message: error.message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to create sales transaction",
        },
      },
      { status: 500 }
    );
  } finally {
    await session.endSession();
  }
}
