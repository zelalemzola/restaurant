import { NextRequest, NextResponse } from "next/server";
import { lowStockMonitor } from "@/lib/services/lowStockMonitor";
import { z } from "zod";

export const runtime = "nodejs";

// Validation schemas
const restockSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  reason: z.string().optional(),
});

const batchRestockSchema = z.array(restockSchema);

const updateThresholdSchema = z.object({
  productId: z.string(),
  minStockLevel: z.number().min(0, "Minimum stock level must be non-negative"),
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

// GET /api/inventory/low-stock - Get low stock items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const urgency = searchParams.get("urgency") as
      | "critical"
      | "warning"
      | "low"
      | null;
    const includeSuggestions =
      searchParams.get("includeSuggestions") === "true";

    let lowStockItems;

    if (urgency) {
      lowStockItems = await lowStockMonitor.getLowStockItemsByUrgency(urgency);
    } else {
      lowStockItems = await lowStockMonitor.getLowStockItems();
    }

    let suggestions: any[] = [];
    if (includeSuggestions) {
      suggestions = await lowStockMonitor.getRestockSuggestions();
    }

    const response: ApiResponse<{
      lowStockItems: any[];
      suggestions?: any[];
      summary: {
        total: number;
        critical: number;
        warning: number;
        low: number;
      };
    }> = {
      success: true,
      data: {
        lowStockItems,
        ...(includeSuggestions && { suggestions }),
        summary: {
          total: lowStockItems.length,
          critical: lowStockItems.filter(
            (item) => item.urgencyLevel === "critical"
          ).length,
          warning: lowStockItems.filter(
            (item) => item.urgencyLevel === "warning"
          ).length,
          low: lowStockItems.filter((item) => item.urgencyLevel === "low")
            .length,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Low stock GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LOW_STOCK_FETCH_ERROR",
          message: "Failed to fetch low stock items",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/inventory/low-stock - Restock items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "restock": {
        const validatedData = restockSchema.parse(body);
        const success = await lowStockMonitor.restockItem(
          validatedData.productId,
          validatedData.quantity,
          validatedData.reason
        );

        if (!success) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "RESTOCK_FAILED",
                message: "Failed to restock item",
              },
            },
            { status: 400 }
          );
        }

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: "Item restocked successfully" },
        };

        return NextResponse.json(response);
      }

      case "batch-restock": {
        const validatedData = batchRestockSchema.parse(body.items);
        const result = await lowStockMonitor.batchRestock(validatedData);

        const response: ApiResponse<typeof result> = {
          success: true,
          data: result,
        };

        return NextResponse.json(response);
      }

      case "update-threshold": {
        const validatedData = updateThresholdSchema.parse(body);
        const success = await lowStockMonitor.updateStockThreshold(
          validatedData.productId,
          validatedData.minStockLevel
        );

        if (!success) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "THRESHOLD_UPDATE_FAILED",
                message: "Failed to update stock threshold",
              },
            },
            { status: 400 }
          );
        }

        const response: ApiResponse<{ message: string }> = {
          success: true,
          data: { message: "Stock threshold updated successfully" },
        };

        return NextResponse.json(response);
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_ACTION",
              message: "Invalid action specified",
            },
          },
          { status: 400 }
        );
    }
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

    console.error("Low stock POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LOW_STOCK_OPERATION_ERROR",
          message: "Failed to perform low stock operation",
        },
      },
      { status: 500 }
    );
  }
}
