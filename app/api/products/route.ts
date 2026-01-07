// Products API routes
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { Product, ProductGroup } from "@/lib/models";
import { createProductSchema } from "@/lib/validations";
import {
  withAuthAndPermissions,
  auditSuccess,
  auditFailure,
} from "@/lib/middleware/audit-rbac";
import { extractClientInfo } from "@/lib/utils/audit";
import { QueryOptimizations } from "@/lib/utils/database-optimization";
import { PerformanceMonitor } from "@/lib/utils/error-monitoring";
import { invalidateCache } from "@/lib/utils/api-cache";
import { eventBroadcaster } from "@/lib/services/eventBroadcaster";
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

// Optimized product search function
async function searchProducts(query: any, page: number, limit: number) {
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(query, QueryOptimizations.minimalProduct)
      .populate("groupId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    Product.countDocuments(query).exec(),
  ]);

  return {
    products,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "products.read",
    ]);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const type = searchParams.get("type");
    const groupId = searchParams.get("groupId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    // Build query
    const query: any = {};

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    if (type && ["stock", "sellable", "combination"].includes(type)) {
      query.type = type;
    }

    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      query.groupId = groupId;
    }

    // Use optimized search function
    const result = await PerformanceMonitor.measureAsync(
      "products_search",
      () => searchProducts(query, page, limit)
    );

    // Audit successful read operation
    await auditSuccess(
      { user, request },
      "CREATE", // Using CREATE as a placeholder since we don't have READ action
      "PRODUCT",
      undefined,
      {
        operation: "list_products",
        filters: { search, type, groupId },
        resultCount: result.products.length,
        totalCount: result.pagination.total,
      }
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PRODUCTS_FETCH_ERROR",
          message: "Failed to fetch products",
        },
      },
      { status: 500 }
    );
  } finally {
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Slow products API request: ${duration}ms`);
    }
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check authentication and permissions (bypass in development for testing)
    let user: any;
    if (
      process.env.NODE_ENV === "development" &&
      request.headers.get("x-test-mode") === "true"
    ) {
      // Use a test user for development testing
      user = {
        id: "694e5814568234dcb91b4816", // Use a valid ObjectId for testing
        email: "test@example.com",
        name: "Test User",
        role: "admin",
      };
    } else {
      const { user: authUser, error } = await withAuthAndPermissions(request, [
        "products.create",
      ]);
      if (error) return error;
      user = authUser;
    }

    const body = await request.json();

    // Validate request body
    const validatedData = createProductSchema.parse(body);

    await connectDB();

    // Verify product group exists
    const productGroup = await ProductGroup.findById(validatedData.groupId);
    if (!productGroup) {
      // Audit failed operation
      await auditFailure(
        { user, request },
        "CREATE",
        "PRODUCT",
        undefined,
        {
          operation: "create_product",
          productData: validatedData,
          error: "Product group not found",
        },
        "Product group not found"
      );

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "INVALID_GROUP",
          message: "Product group not found",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if product with same name already exists in the same group
    const existingProduct = await Product.findOne({
      name: validatedData.name,
      groupId: validatedData.groupId,
    });
    if (existingProduct) {
      // Audit failed operation
      await auditFailure(
        { user, request },
        "CREATE",
        "PRODUCT",
        undefined,
        {
          operation: "create_product",
          productData: validatedData,
          error: "Duplicate product name in group",
        },
        "Product with this name already exists in the selected group"
      );

      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: "DUPLICATE_NAME",
          message:
            "Product with this name already exists in the selected group",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const product = new Product(validatedData);
    await product.save();

    // Populate the group info before returning
    await product.populate("groupId", "name description");

    // Invalidate related caches
    invalidateCache("products");

    // Broadcast real-time update
    eventBroadcaster.broadcastProductCreated(product.toObject(), user.id);

    // Audit successful operation
    await auditSuccess(
      { user, request },
      "CREATE",
      "PRODUCT",
      product._id.toString(),
      {
        operation: "create_product",
        productName: product.name,
        productType: product.type,
        groupName: productGroup.name,
        productData: validatedData,
      }
    );

    const response: ApiResponse<typeof product> = {
      success: true,
      data: product,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Products POST error:", error);

    // Check if it's a validation error (Zod)
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input data",
            details: (error as any).issues,
          },
        },
        { status: 400 }
      );
    }

    // Check if it's a MongoDB error
    if (
      error instanceof Error &&
      (error.name === "MongoError" || error.name === "ValidationError")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Database operation failed",
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PRODUCT_CREATE_ERROR",
          message: "Failed to create product",
        },
      },
      { status: 500 }
    );
  } finally {
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`Slow products POST request: ${duration}ms`);
    }
  }
}
