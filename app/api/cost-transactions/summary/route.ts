import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import CostTransaction from "@/lib/models/CostTransaction";
import { costCalculator, DecimalUtils } from "@/lib/services/costCalculator";

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

// GET /api/cost-transactions/summary - Get cost summary
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Parse date range
    let dateRange: { startDate: Date; endDate: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      };
    }

    // Get comprehensive cost summary using cost calculator
    const totalCosts = await costCalculator.calculateTotalCosts(dateRange);

    // Build match stage for aggregations
    const matchStage: any = {};
    if (dateRange) {
      matchStage.date = {};
      if (dateRange.startDate) matchStage.date.$gte = dateRange.startDate;
      if (dateRange.endDate) matchStage.date.$lte = dateRange.endDate;
    }

    // Get additional summaries from cost transactions using direct aggregation
    const [costsByType, costsByCategory, monthlyTrend] = await Promise.all([
      // Cost summary by type
      CostTransaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$type",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
            avgAmount: { $avg: "$amount" },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),

      // Cost summary by category
      CostTransaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { type: "$type", category: "$category" },
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
            avgAmount: { $avg: "$amount" },
          },
        },
        {
          $group: {
            _id: "$_id.type",
            categories: {
              $push: {
                category: "$_id.category",
                totalAmount: "$totalAmount",
                count: "$count",
                avgAmount: "$avgAmount",
              },
            },
            typeTotal: { $sum: "$totalAmount" },
          },
        },
        { $sort: { typeTotal: -1 } },
      ]),

      // Monthly trend (last 12 months)
      (() => {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);

        return CostTransaction.aggregate([
          { $match: { date: { $gte: startDate } } },
          {
            $group: {
              _id: {
                year: { $year: "$date" },
                month: { $month: "$date" },
                type: "$type",
              },
              totalAmount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          {
            $group: {
              _id: {
                year: "$_id.year",
                month: "$_id.month",
              },
              costs: {
                $push: {
                  type: "$_id.type",
                  amount: "$totalAmount",
                  count: "$count",
                },
              },
              monthTotal: { $sum: "$totalAmount" },
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
            },
          },
        ]);
      })(),
    ]);

    // Convert Decimal values to numbers for JSON serialization
    const response: ApiResponse<{
      totalCosts: {
        totalInventoryCosts: number;
        totalOperationalCosts: number;
        totalOverheadCosts: number;
        grandTotal: number;
        monthlyBreakdown: Array<{
          month: string;
          inventoryCosts: number;
          operationalCosts: number;
          overheadCosts: number;
          total: number;
        }>;
        categoryBreakdown: Array<{
          category: string;
          amount: number;
          percentage: number;
        }>;
      };
      costsByType: any[];
      costsByCategory: any[];
      monthlyTrend: any[];
    }> = {
      success: true,
      data: {
        totalCosts: {
          totalInventoryCosts: DecimalUtils.toNumber(
            totalCosts.totalInventoryCosts
          ),
          totalOperationalCosts: DecimalUtils.toNumber(
            totalCosts.totalOperationalCosts
          ),
          totalOverheadCosts: DecimalUtils.toNumber(
            totalCosts.totalOverheadCosts
          ),
          grandTotal: DecimalUtils.toNumber(totalCosts.grandTotal),
          monthlyBreakdown: totalCosts.monthlyBreakdown.map((item) => ({
            month: item.month,
            inventoryCosts: DecimalUtils.toNumber(item.inventoryCosts),
            operationalCosts: DecimalUtils.toNumber(item.operationalCosts),
            overheadCosts: DecimalUtils.toNumber(item.overheadCosts),
            total: DecimalUtils.toNumber(item.total),
          })),
          categoryBreakdown: totalCosts.categoryBreakdown.map((item) => ({
            category: item.category,
            amount: DecimalUtils.toNumber(item.amount),
            percentage: DecimalUtils.toNumber(item.percentage),
          })),
        },
        costsByType,
        costsByCategory,
        monthlyTrend,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Cost summary GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "COST_SUMMARY_FETCH_ERROR",
          message: "Failed to fetch cost summary",
        },
      },
      { status: 500 }
    );
  }
}
