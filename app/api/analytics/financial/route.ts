import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SalesTransaction from "@/lib/models/SalesTransaction";
import CostOperation from "@/lib/models/CostOperation";
import CostExpense from "@/lib/models/CostExpense";
import Product from "@/lib/models/Product";

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

    // Get total revenue
    const revenueResult = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    // Get total costs from cost operations
    const costsResult = await CostOperation.aggregate([
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCosts: { $sum: "$amount" },
        },
      },
    ]);

    const operationalCosts = costsResult[0]?.totalCosts || 0;

    // Get total costs from inventory expenses
    const inventoryExpensesResult = await CostExpense.aggregate([
      {
        $match: {
          recordedAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: null,
          totalInventoryExpenses: { $sum: "$totalAmount" },
        },
      },
    ]);

    const inventoryExpenses =
      inventoryExpensesResult[0]?.totalInventoryExpenses || 0;

    // Calculate total costs (operational + inventory)
    const totalCosts = operationalCosts + inventoryExpenses;

    // Calculate net profit
    const netProfit = totalRevenue - totalCosts;

    // Get cost breakdown by category (operational costs)
    const costBreakdown = await CostOperation.aggregate([
      {
        $match: {
          date: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$amount" },
        },
      },
      {
        $project: {
          category: "$_id",
          amount: 1,
          _id: 0,
        },
      },
    ]);

    // Get inventory cost breakdown by category
    const inventoryBreakdown = await CostExpense.aggregate([
      {
        $match: {
          recordedAt: { $gte: queryStartDate, $lte: queryEndDate },
        },
      },
      {
        $group: {
          _id: "$category",
          amount: { $sum: "$totalAmount" },
        },
      },
      {
        $project: {
          category: "$_id",
          amount: 1,
          _id: 0,
        },
      },
    ]);

    // Convert to object format and combine both cost types
    const costBreakdownObj: Record<string, number> = {};

    // Add operational costs
    costBreakdown.forEach((item) => {
      const category = `operational_${item.category}`;
      costBreakdownObj[category] = item.amount;
    });

    // Add inventory costs
    inventoryBreakdown.forEach((item) => {
      const category = `inventory_${item.category}`;
      costBreakdownObj[category] = item.amount;
    });

    // Get product profitability for combination items
    const productProfitability = await SalesTransaction.aggregate([
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
        $match: {
          "product.type": "combination",
        },
      },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$product.name" },
          costPrice: { $first: "$product.costPrice" },
          sellingPrice: { $first: "$product.sellingPrice" },
          totalSold: { $sum: "$items.quantity" },
        },
      },
      {
        $project: {
          productId: "$_id",
          productName: 1,
          costPrice: 1,
          sellingPrice: 1,
          totalSold: 1,
          profitMargin: { $subtract: ["$sellingPrice", "$costPrice"] },
          _id: 0,
        },
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalCosts,
          operationalCosts,
          inventoryExpenses,
          netProfit,
        },
        costBreakdown: costBreakdownObj,
        productProfitability,
        dateRange: {
          startDate: queryStartDate.toISOString().split("T")[0],
          endDate: queryEndDate.toISOString().split("T")[0],
        },
      },
    });
  } catch (error) {
    console.error("Financial analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FINANCIAL_ANALYTICS_ERROR",
          message: "Failed to fetch financial analytics",
        },
      },
      { status: 500 }
    );
  }
}
