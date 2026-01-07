import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CostTransaction from "@/lib/models/CostTransaction";
import { eventBroadcaster } from "@/lib/services/eventBroadcaster";
import { z } from "zod";

export const runtime = "nodejs";

// Validation schema
const createCostTransactionSchema = z.object({
  type: z.enum(["inventory", "operational", "overhead"]),
  category: z.string().min(1, "Category is required"),
  amount: z.number().min(0, "Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  date: z.string().datetime().optional(),
  relatedEntity: z
    .object({
      type: z.enum(["product", "operation", "general"]),
      id: z.string(),
      name: z.string(),
    })
    .optional(),
  metadata: z
    .object({
      productQuantity: z.number().min(0).optional(),
      unitCost: z.number().min(0).optional(),
      supplier: z.string().optional(),
      invoiceNumber: z.string().optional(),
      paymentMethod: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

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

// GET /api/cost-transactions - List cost transactions
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const relatedEntityType = searchParams.get("relatedEntityType");
    const relatedEntityId = searchParams.get("relatedEntityId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    // Build query
    const query: any = {};

    if (type && ["inventory", "operational", "overhead"].includes(type)) {
      query.type = type;
    }

    if (category) {
      query.category = { $regex: category, $options: "i" };
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (relatedEntityType && relatedEntityId) {
      query["relatedEntity.type"] = relatedEntityType;
      query["relatedEntity.id"] = relatedEntityId;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      CostTransaction.find(query)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      CostTransaction.countDocuments(query).exec(),
    ]);

    const response: ApiResponse<{
      transactions: any[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        transactions,
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
    console.error("Cost transactions GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COST_TRANSACTIONS_FETCH_ERROR",
          message: "Failed to fetch cost transactions",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/cost-transactions - Create cost transaction
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = createCostTransactionSchema.parse(body);

    await connectDB();

    // Create cost transaction
    const costTransaction = new CostTransaction({
      ...validatedData,
      date: validatedData.date ? new Date(validatedData.date) : new Date(),
      createdBy: "system", // TODO: Get from authenticated user
    });

    await costTransaction.save();

    // Broadcast real-time update
    eventBroadcaster.broadcastCostCreated(costTransaction.toObject());

    const response: ApiResponse<typeof costTransaction> = {
      success: true,
      data: costTransaction,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error("Cost transaction POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COST_TRANSACTION_CREATE_ERROR",
          message: "Failed to create cost transaction",
        },
      },
      { status: 500 }
    );
  }
}
