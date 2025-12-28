import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import StockTransaction from "@/lib/models/StockTransaction";
import { withAuthAndPermissions } from "@/lib/middleware/audit-rbac";

export async function PATCH(request: NextRequest) {
  try {
    // Check authentication and permissions
    const { user, error } = await withAuthAndPermissions(request, [
      "products.update",
    ]);
    if (error) return error;

    await connectDB();

    const body = await request.json();
    const { productIds, updates } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "Product IDs are required" },
        },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_INPUT", message: "Updates are required" },
        },
        { status: 400 }
      );
    }

    let modifiedCount = 0;

    // Handle different types of updates
    if (updates.groupId) {
      const result = await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { groupId: updates.groupId } }
      );
      modifiedCount += result.modifiedCount;
    }

    if (updates.archived !== undefined) {
      const result = await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { archived: updates.archived } }
      );
      modifiedCount += result.modifiedCount;
    }

    // Handle stock adjustments
    if (updates.stockAdjustment) {
      const products = await Product.find({ _id: { $in: productIds } });

      for (const product of products) {
        const newQuantity = Math.max(
          0,
          product.currentQuantity + updates.stockAdjustment.adjustment
        );

        await Product.findByIdAndUpdate(product._id, {
          currentQuantity: newQuantity,
        });

        // Create stock transaction record
        await StockTransaction.create({
          productId: product._id,
          type: updates.stockAdjustment.adjustment > 0 ? "addition" : "usage",
          quantity: Math.abs(updates.stockAdjustment.adjustment),
          previousQuantity: product.currentQuantity,
          newQuantity: newQuantity,
          reason: updates.stockAdjustment.reason,
          userId: user.id,
        });

        modifiedCount++;
      }
    }

    // Handle price adjustments
    if (updates.costPriceAdjustment || updates.sellingPriceAdjustment) {
      const products = await Product.find({ _id: { $in: productIds } });

      for (const product of products) {
        const updateFields: any = {};

        if (updates.costPriceAdjustment && product.costPrice) {
          if (updates.costPriceAdjustment.type === "percentage") {
            updateFields.costPrice =
              product.costPrice * (1 + updates.costPriceAdjustment.value / 100);
          } else {
            updateFields.costPrice = Math.max(
              0,
              product.costPrice + updates.costPriceAdjustment.value
            );
          }
        }

        if (updates.sellingPriceAdjustment && product.sellingPrice) {
          if (updates.sellingPriceAdjustment.type === "percentage") {
            updateFields.sellingPrice =
              product.sellingPrice *
              (1 + updates.sellingPriceAdjustment.value / 100);
          } else {
            updateFields.sellingPrice = Math.max(
              0,
              product.sellingPrice + updates.sellingPriceAdjustment.value
            );
          }
        }

        if (Object.keys(updateFields).length > 0) {
          await Product.findByIdAndUpdate(product._id, updateFields);
          modifiedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { modifiedCount },
    });
  } catch (error) {
    console.error("Bulk update products error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update products",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
