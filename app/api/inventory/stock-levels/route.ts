// Inventory stock levels API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Product } from "@/lib/models";
import mongoose from "mongoose";

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

interface StockLevelItem {
  _id: string;
  name: string;
  type: "stock" | "sellable" | "combination";
  metric: string;
  currentQuantity: number;
  minStockLevel: number;
  isLowStock: boolean;
  stockStatus: "in-stock" | "low-stock" | "out-of-stock";
  group: {
    _id: string;
    name: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const groupId = searchParams.get("groupId");
    const stockStatus = searchParams.get("stockStatus");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    // Build query - only include stock and combination items for inventory tracking
    const query: any = {
      type: { $in: ["stock", "combination"] },
    };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (type && ["stock", "combination"].includes(type)) {
      query.type = type;
    }

    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      query.groupId = groupId;
    }

    // Add stock status filter
    if (stockStatus) {
      switch (stockStatus) {
        case "low-stock":
          query.$expr = { $lte: ["$currentQuantity", "$minStockLevel"] };
          break;
        case "out-of-stock":
          query.currentQuantity = 0;
          break;
        case "in-stock":
          query.$expr = { $gt: ["$currentQuantity", "$minStockLevel"] };
          break;
      }
    }

    // Get products with pagination and populate group info
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("groupId", "name description")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(query),
    ]);

    // Transform products to include stock status
    const stockLevels: StockLevelItem[] = products.map((product) => {
      const isLowStock = product.currentQuantity <= product.minStockLevel;
      const isOutOfStock = product.currentQuantity === 0;

      let stockStatus: "in-stock" | "low-stock" | "out-of-stock";
      if (isOutOfStock) {
        stockStatus = "out-of-stock";
      } else if (isLowStock) {
        stockStatus = "low-stock";
      } else {
        stockStatus = "in-stock";
      }

      return {
        _id: product._id.toString(),
        name: product.name,
        type: product.type,
        metric: product.metric,
        currentQuantity: product.currentQuantity,
        minStockLevel: product.minStockLevel,
        isLowStock,
        stockStatus,
        group: {
          _id: product.groupId._id.toString(),
          name: product.groupId.name,
        },
      };
    });

    // Get summary statistics
    const summaryStats = await Product.aggregate([
      { $match: { type: { $in: ["stock", "combination"] } } },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          lowStockItems: {
            $sum: {
              $cond: [{ $lte: ["$currentQuantity", "$minStockLevel"] }, 1, 0],
            },
          },
          outOfStockItems: {
            $sum: {
              $cond: [{ $eq: ["$currentQuantity", 0] }, 1, 0],
            },
          },
          inStockItems: {
            $sum: {
              $cond: [{ $gt: ["$currentQuantity", "$minStockLevel"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const stats = summaryStats[0] || {
      totalItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      inStockItems: 0,
    };

    const response: ApiResponse<{
      stockLevels: StockLevelItem[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
      summary: typeof stats;
    }> = {
      success: true,
      data: {
        stockLevels,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: stats,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching stock levels:", error);
    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: "FETCH_ERROR",
        message: "Failed to fetch stock levels",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
