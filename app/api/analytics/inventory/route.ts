import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import StockTransaction from "@/lib/models/StockTransaction";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Default to last 30 days if no dates provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);

    const queryStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const queryEndDate = endDate ? new Date(endDate) : defaultEndDate;

    // Ensure end date includes the full day
    queryEndDate.setHours(23, 59, 59, 999);

    const daysDiff = Math.ceil(
      (queryEndDate.getTime() - queryStartDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Get inventory turnover rates
    const turnoverRates = await Product.aggregate([
      {
        $lookup: {
          from: "stocktransactions",
          localField: "_id",
          foreignField: "productId",
          as: "stockTransactions",
        },
      },
      {
        $addFields: {
          relevantTransactions: {
            $filter: {
              input: "$stockTransactions",
              cond: {
                $and: [
                  { $gte: ["$$this.createdAt", queryStartDate] },
                  { $lte: ["$$this.createdAt", queryEndDate] },
                  { $in: ["$$this.type", ["usage", "sale"]] },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          totalUsage: {
            $sum: {
              $map: {
                input: "$relevantTransactions",
                as: "transaction",
                in: { $abs: "$$transaction.quantity" },
              },
            },
          },
        },
      },
      {
        $project: {
          productId: "$_id",
          productName: "$name",
          currentStock: "$currentQuantity",
          totalUsage: 1,
          turnoverRate: {
            $cond: {
              if: { $gt: ["$currentQuantity", 0] },
              then: { $divide: ["$totalUsage", "$currentQuantity"] },
              else: 0,
            },
          },
          _id: 0,
        },
      },
      { $sort: { turnoverRate: -1 } },
    ]);

    // Get stock usage patterns
    const usagePatterns = await StockTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
          type: { $in: ["usage", "sale"] },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$productId",
          productName: { $first: "$product.name" },
          totalUsage: { $sum: { $abs: "$quantity" } },
          usageCount: { $sum: 1 },
        },
      },
      {
        $project: {
          productId: "$_id",
          productName: 1,
          totalUsage: 1,
          averageDailyUsage: {
            $divide: ["$totalUsage", daysDiff || 1],
          },
          _id: 0,
        },
      },
      { $sort: { totalUsage: -1 } },
    ]);

    // Calculate average turnover rate
    const avgTurnoverRate =
      turnoverRates.length > 0
        ? turnoverRates.reduce((sum, item) => sum + item.turnoverRate, 0) /
          turnoverRates.length
        : 0;

    // Classify fast and slow moving items
    const fastMoving = turnoverRates.filter(
      (item) => item.turnoverRate > avgTurnoverRate
    );
    const slowMoving = turnoverRates.filter(
      (item) => item.turnoverRate <= avgTurnoverRate
    );

    return NextResponse.json({
      success: true,
      data: {
        turnoverRates,
        usagePatterns,
        movementAnalysis: {
          fastMoving,
          slowMoving,
        },
      },
    });
  } catch (error) {
    console.error("Inventory analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVENTORY_ANALYTICS_ERROR",
          message: "Failed to fetch inventory analytics",
        },
      },
      { status: 500 }
    );
  }
}
