import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesTransaction from "@/lib/models/SalesTransaction";

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

    // Get sales trends by day
    const trends = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          revenue: { $sum: "$totalAmount" },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          date: "$_id",
          revenue: 1,
          transactionCount: 1,
          _id: 0,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Get popular products
    const popularProducts = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$product.name" },
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalPrice" },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          productId: "$_id",
          productName: 1,
          totalQuantitySold: 1,
          totalRevenue: 1,
          transactionCount: 1,
          _id: 0,
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 20 },
    ]);

    // Get payment method distribution
    const totalTransactions = await SalesTransaction.countDocuments({
      createdAt: { $gte: queryStartDate, $lte: queryEndDate },
    });

    const paymentMethodStats = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          method: "$_id",
          count: 1,
          totalAmount: 1,
          percentage: {
            $multiply: [{ $divide: ["$count", totalTransactions || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Convert to object format for easier access
    const paymentMethodDistribution: Record<
      string,
      { count: number; totalAmount: number; percentage: number }
    > = {};
    paymentMethodStats.forEach((item) => {
      paymentMethodDistribution[item.method] = {
        count: item.count,
        totalAmount: item.totalAmount,
        percentage: item.percentage,
      };
    });

    // Calculate summary
    const totalRevenue = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const summary = {
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTransactions,
    };

    return NextResponse.json({
      success: true,
      data: {
        trends,
        popularProducts,
        paymentMethodDistribution,
        summary,
        dateRange: {
          startDate: queryStartDate.toISOString().split("T")[0],
          endDate: queryEndDate.toISOString().split("T")[0],
        },
      },
    });
  } catch (error) {
    console.error("Sales analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SALES_ANALYTICS_ERROR",
          message: "Failed to fetch sales analytics",
        },
      },
      { status: 500 }
    );
  }
}
