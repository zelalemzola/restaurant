// Profit Margins API routes
import { NextRequest, NextResponse } from "next/server";
import { profitMarginService } from "@/lib/services/profitMarginService";

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
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "analysis";
    const productId = searchParams.get("productId");
    const threshold = parseFloat(searchParams.get("threshold") || "10");
    const targetMargin = parseFloat(searchParams.get("targetMargin") || "25");

    let data: any;

    switch (action) {
      case "product":
        if (!productId) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "productId is required for product action",
            },
          };
          return NextResponse.json(response, { status: 400 });
        }
        data = await profitMarginService.calculateProductProfitMargin(
          productId
        );
        break;

      case "all":
        data = await profitMarginService.calculateAllProductProfitMargins();
        break;

      case "low-profit":
        data = await profitMarginService.getLowProfitMarginProducts(threshold);
        break;

      case "trends":
        data = await profitMarginService.getProfitMarginTrends();
        break;

      case "recommendations":
        data = await profitMarginService.getPricingRecommendations(
          targetMargin
        );
        break;

      case "analysis":
      default:
        data = await profitMarginService.getProfitAnalysis();
        break;
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in profit margins API:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "PROFIT_MARGIN_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to calculate profit margins",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productId, daysSinceLastCalculation } = body;

    let data: any;

    switch (action) {
      case "update-stale":
        data = await profitMarginService.updateStaleProductProfitMargins(
          daysSinceLastCalculation || 7
        );
        break;

      case "recalculate-product":
        if (!productId) {
          const response: ApiResponse<never> = {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "productId is required for recalculate-product action",
            },
          };
          return NextResponse.json(response, { status: 400 });
        }
        data = await profitMarginService.calculateProductProfitMargin(
          productId
        );
        break;

      case "recalculate-all":
        data = await profitMarginService.calculateAllProductProfitMargins();
        break;

      default:
        const response: ApiResponse<never> = {
          success: false,
          error: {
            code: "INVALID_ACTION",
            message: "Invalid action specified",
          },
        };
        return NextResponse.json(response, { status: 400 });
    }

    const response: ApiResponse<typeof data> = {
      success: true,
      data,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error in profit margins POST API:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "PROFIT_MARGIN_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to process profit margin request",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
