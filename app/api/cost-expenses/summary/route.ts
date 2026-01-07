// Cost Expenses Summary API route
import { NextRequest, NextResponse } from "next/server";
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
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const months = parseInt(searchParams.get("months") || "12");

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    // Get cost expense summary
    const [summary, totalExpenses, monthlyTrend] = await Promise.all([
      costExpenseService.getCostExpenseSummary(startDateObj, endDateObj),
      costExpenseService.getTotalCostExpenses(startDateObj, endDateObj),
      costExpenseService.getMonthlyExpenseTrend(months),
    ]);

    const response: ApiResponse<{
      summary: typeof summary;
      totalExpenses: typeof totalExpenses;
      monthlyTrend: typeof monthlyTrend;
    }> = {
      success: true,
      data: {
        summary,
        totalExpenses,
        monthlyTrend,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching cost expense summary:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "SUMMARY_ERROR",
        message: "Failed to fetch cost expense summary",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
