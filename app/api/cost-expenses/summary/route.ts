// Cost Expenses Summary API route
import { NextRequest, NextResponse } from "next/server";
import { costExpenseService } from "@/lib/services/costExpenseService";
import CostOperation from "@/lib/models/CostOperation";
import connectDB from "@/lib/mongodb";

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

// Map CostOperation categories to expense categories
function mapCostOperationCategoryToExpenseCategory(
  category: string
): "inventory" | "operational" | "overhead" {
  switch (category) {
    case "salary":
    case "utilities":
    case "maintenance":
      return "operational";
    case "rent":
    case "other":
    default:
      return "overhead";
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const months = parseInt(searchParams.get("months") || "12");

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    // Get cost expense summary (from CostExpense records)
    const [summary, totalExpenses, monthlyTrend, costOperations] =
      await Promise.all([
        costExpenseService.getCostExpenseSummary(startDateObj, endDateObj),
        costExpenseService.getTotalCostExpenses(startDateObj, endDateObj),
        costExpenseService.getMonthlyExpenseTrend(months),
        // Get CostOperation records for the date range
        CostOperation.find(
          startDateObj || endDateObj
            ? {
                date: {
                  ...(startDateObj && { $gte: startDateObj }),
                  ...(endDateObj && { $lte: endDateObj }),
                },
              }
            : {}
        ).lean(),
      ]);

    // Calculate totals from CostOperation records
    let costOperationInventory = 0;
    let costOperationOperational = 0;
    let costOperationOverhead = 0;

    costOperations.forEach((operation: any) => {
      const expenseCategory = mapCostOperationCategoryToExpenseCategory(
        operation.category
      );
      const amount = operation.amount || 0;

      switch (expenseCategory) {
        case "inventory":
          costOperationInventory += amount;
          break;
        case "operational":
          costOperationOperational += amount;
          break;
        case "overhead":
          costOperationOverhead += amount;
          break;
      }
    });

    // Combine CostExpense and CostOperation totals
    const combinedTotalExpenses = {
      totalInventoryExpenses:
        totalExpenses.totalInventoryExpenses + costOperationInventory,
      totalOperationalExpenses:
        totalExpenses.totalOperationalExpenses + costOperationOperational,
      totalOverheadExpenses:
        totalExpenses.totalOverheadExpenses + costOperationOverhead,
      grandTotal:
        totalExpenses.totalInventoryExpenses +
        totalExpenses.totalOperationalExpenses +
        totalExpenses.totalOverheadExpenses +
        costOperationInventory +
        costOperationOperational +
        costOperationOverhead,
    };

    const response: ApiResponse<{
      summary: typeof summary;
      totalExpenses: typeof combinedTotalExpenses;
      monthlyTrend: typeof monthlyTrend;
    }> = {
      success: true,
      data: {
        summary,
        totalExpenses: combinedTotalExpenses,
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
