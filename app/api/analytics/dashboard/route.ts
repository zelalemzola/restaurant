import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import SalesTransaction from "@/lib/models/SalesTransaction";
import Notification from "@/lib/models/Notification";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    // Get daily sales summary
    const dailySalesResult = await SalesTransaction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          transactionCount: { $sum: 1 },
        },
      },
    ]);

    const dailySales = dailySalesResult[0] || {
      totalRevenue: 0,
      transactionCount: 0,
    };

    // Get low stock items (only those with stock tracking enabled)
    const lowStockItems = await Product.find({
      $expr: {
        $lte: ["$currentQuantity", "$minStockLevel"],
      },
      stockTrackingEnabled: { $ne: false }, // Only include products with stock tracking enabled
    })
      .select("name currentQuantity minStockLevel")
      .lean();

    const lowStockCount = lowStockItems.length;

    // Get recent transactions (last 5)
    const recentTransactions = await SalesTransaction.find()
      .populate("items.productId", "name")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        dailySales,
        lowStockCount,
        lowStockItems,
        recentTransactions: recentTransactions.map((transaction) => ({
          _id: transaction._id,
          totalAmount: transaction.totalAmount,
          paymentMethod: transaction.paymentMethod,
          itemCount: transaction.items.length,
          createdAt: transaction.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard analytics API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DASHBOARD_ANALYTICS_ERROR",
          message: "Failed to fetch dashboard analytics",
        },
      },
      { status: 500 }
    );
  }
}
