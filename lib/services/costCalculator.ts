import Decimal from "decimal.js";
import connectDB from "@/lib/mongodb";
import { Product } from "@/lib/models";
import mongoose from "mongoose";

// Type alias for Decimal instances
type DecimalType = InstanceType<typeof Decimal>;

// Configure Decimal.js for financial precision
Decimal.config({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -7,
  toExpPos: 21,
});

export interface CostBreakdown {
  inventoryCost: DecimalType;
  operationalCost: DecimalType;
  overheadCost: DecimalType;
  totalCost: DecimalType;
  costPerUnit?: DecimalType;
  profitMargin?: DecimalType;
}

export interface CostAllocation {
  productId: string;
  inventoryPercentage: number;
  operationalPercentage: number;
  overheadPercentage: number;
}

export interface TotalCosts {
  totalInventoryCosts: DecimalType;
  totalOperationalCosts: DecimalType;
  totalOverheadCosts: DecimalType;
  grandTotal: DecimalType;
  monthlyBreakdown: Array<{
    month: string;
    inventoryCosts: DecimalType;
    operationalCosts: DecimalType;
    overheadCosts: DecimalType;
    total: DecimalType;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: DecimalType;
    percentage: DecimalType;
  }>;
}

export interface ProductCostData {
  productId: string;
  costPrice: DecimalType;
  quantity: number;
  totalCost: DecimalType;
  lastUpdated: Date;
}

class CostCalculationEngine {
  // Calculate product-specific costs
  async calculateProductCost(productId: string): Promise<CostBreakdown> {
    try {
      await connectDB();

      // Get product data
      const product = await Product.findById(productId).lean();
      if (!product) {
        throw new Error("Product not found");
      }

      const costPrice = new Decimal(product.costPrice || 0);
      const quantity = new Decimal(product.currentQuantity || 0);

      // Calculate base inventory cost
      const inventoryCost = costPrice.times(quantity);

      // Get operational costs allocated to this product
      const operationalCost = await this.getOperationalCostsForProduct(
        productId
      );

      // Get overhead costs allocated to this product
      const overheadCost = await this.getOverheadCostsForProduct(productId);

      // Calculate total cost
      const totalCost = inventoryCost.plus(operationalCost).plus(overheadCost);

      // Calculate cost per unit
      const costPerUnit = quantity.greaterThan(0)
        ? totalCost.dividedBy(quantity)
        : new Decimal(0);

      // Calculate profit margin if selling price is available
      let profitMargin = new Decimal(0);
      if (product.sellingPrice && product.sellingPrice > 0) {
        const sellingPrice = new Decimal(product.sellingPrice);
        const profit = sellingPrice.minus(costPerUnit);
        profitMargin = sellingPrice.greaterThan(0)
          ? profit.dividedBy(sellingPrice).times(100)
          : new Decimal(0);
      }

      return {
        inventoryCost,
        operationalCost,
        overheadCost,
        totalCost,
        costPerUnit,
        profitMargin,
      };
    } catch (error) {
      console.error("Error calculating product cost:", error);
      throw error;
    }
  }

  // Calculate total costs across all categories
  async calculateTotalCosts(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<TotalCosts> {
    try {
      await connectDB();

      const matchStage: any = {};
      if (dateRange) {
        matchStage.createdAt = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }

      // Aggregate costs from cost operations collection
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const costAggregation = await db
        .collection("costoperations")
        .aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: "$type",
              totalAmount: { $sum: "$amount" },
              operations: { $push: "$ROOT" },
            },
          },
        ])
        .toArray();

      // Calculate inventory costs from products
      const inventoryCosts = await this.calculateInventoryCosts();

      // Initialize totals
      let totalInventoryCosts = inventoryCosts;
      let totalOperationalCosts = new Decimal(0);
      let totalOverheadCosts = new Decimal(0);

      // Process cost operations
      costAggregation.forEach((group: any) => {
        const amount = new Decimal(group.totalAmount || 0);
        switch (group._id) {
          case "inventory":
            totalInventoryCosts = totalInventoryCosts.plus(amount);
            break;
          case "operational":
            totalOperationalCosts = totalOperationalCosts.plus(amount);
            break;
          case "overhead":
            totalOverheadCosts = totalOverheadCosts.plus(amount);
            break;
        }
      });

      const grandTotal = totalInventoryCosts
        .plus(totalOperationalCosts)
        .plus(totalOverheadCosts);

      // Calculate monthly breakdown
      const monthlyBreakdown = await this.calculateMonthlyBreakdown(dateRange);

      // Calculate category breakdown
      const categoryBreakdown = await this.calculateCategoryBreakdown(
        dateRange
      );

      return {
        totalInventoryCosts,
        totalOperationalCosts,
        totalOverheadCosts,
        grandTotal,
        monthlyBreakdown,
        categoryBreakdown,
      };
    } catch (error) {
      console.error("Error calculating total costs:", error);
      throw error;
    }
  }

  // Calculate inventory costs from all products
  private async calculateInventoryCosts(): Promise<DecimalType> {
    try {
      const products = await Product.find(
        {},
        "costPrice currentQuantity"
      ).lean();

      let totalInventoryCost = new Decimal(0);

      products.forEach((product) => {
        const costPrice = new Decimal(product.costPrice || 0);
        const quantity = new Decimal(product.currentQuantity || 0);
        const productCost = costPrice.times(quantity);
        totalInventoryCost = totalInventoryCost.plus(productCost);
      });

      return totalInventoryCost;
    } catch (error) {
      console.error("Error calculating inventory costs:", error);
      return new Decimal(0);
    }
  }

  // Get operational costs allocated to a specific product
  private async getOperationalCostsForProduct(
    productId: string
  ): Promise<DecimalType> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      // Get operational costs that are specifically related to this product
      const productOperationalCosts = await db
        .collection("costoperations")
        .aggregate([
          {
            $match: {
              type: "operational",
              "relatedEntity.type": "product",
              "relatedEntity.id": productId,
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const directCosts =
        productOperationalCosts.length > 0
          ? new Decimal(productOperationalCosts[0].totalAmount || 0)
          : new Decimal(0);

      // Get general operational costs and allocate proportionally
      const generalOperationalCosts = await db
        .collection("costoperations")
        .aggregate([
          {
            $match: {
              type: "operational",
              $or: [
                { "relatedEntity.type": { $ne: "product" } },
                { relatedEntity: { $exists: false } },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const generalCosts =
        generalOperationalCosts.length > 0
          ? new Decimal(generalOperationalCosts[0].totalAmount || 0)
          : new Decimal(0);

      // Allocate general costs based on product value (cost * quantity)
      const product = await Product.findById(
        productId,
        "costPrice currentQuantity"
      ).lean();
      if (!product) return directCosts;

      const productValue = new Decimal(product.costPrice || 0).times(
        new Decimal(product.currentQuantity || 0)
      );
      const totalInventoryValue = await this.calculateInventoryCosts();

      const allocationPercentage = totalInventoryValue.greaterThan(0)
        ? productValue.dividedBy(totalInventoryValue)
        : new Decimal(0);

      const allocatedGeneralCosts = generalCosts.times(allocationPercentage);

      return directCosts.plus(allocatedGeneralCosts);
    } catch (error) {
      console.error("Error getting operational costs for product:", error);
      return new Decimal(0);
    }
  }

  // Get overhead costs allocated to a specific product
  private async getOverheadCostsForProduct(
    productId: string
  ): Promise<DecimalType> {
    try {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      // Get overhead costs that are specifically related to this product
      const productOverheadCosts = await db
        .collection("costoperations")
        .aggregate([
          {
            $match: {
              type: "overhead",
              "relatedEntity.type": "product",
              "relatedEntity.id": productId,
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const directCosts =
        productOverheadCosts.length > 0
          ? new Decimal(productOverheadCosts[0].totalAmount || 0)
          : new Decimal(0);

      // Get general overhead costs and allocate proportionally
      const generalOverheadCosts = await db
        .collection("costoperations")
        .aggregate([
          {
            $match: {
              type: "overhead",
              $or: [
                { "relatedEntity.type": { $ne: "product" } },
                { relatedEntity: { $exists: false } },
              ],
            },
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
            },
          },
        ])
        .toArray();

      const generalCosts =
        generalOverheadCosts.length > 0
          ? new Decimal(generalOverheadCosts[0].totalAmount || 0)
          : new Decimal(0);

      // Allocate general costs based on product value
      const product = await Product.findById(
        productId,
        "costPrice currentQuantity"
      ).lean();
      if (!product) return directCosts;

      const productValue = new Decimal(product.costPrice || 0).times(
        new Decimal(product.currentQuantity || 0)
      );
      const totalInventoryValue = await this.calculateInventoryCosts();

      const allocationPercentage = totalInventoryValue.greaterThan(0)
        ? productValue.dividedBy(totalInventoryValue)
        : new Decimal(0);

      const allocatedGeneralCosts = generalCosts.times(allocationPercentage);

      return directCosts.plus(allocatedGeneralCosts);
    } catch (error) {
      console.error("Error getting overhead costs for product:", error);
      return new Decimal(0);
    }
  }

  // Calculate monthly cost breakdown
  private async calculateMonthlyBreakdown(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<
    Array<{
      month: string;
      inventoryCosts: DecimalType;
      operationalCosts: DecimalType;
      overheadCosts: DecimalType;
      total: DecimalType;
    }>
  > {
    try {
      const matchStage: any = {};
      if (dateRange) {
        matchStage.createdAt = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const monthlyData = await db
        .collection("costoperations")
        .aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
                type: "$type",
              },
              totalAmount: { $sum: "$amount" },
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
                },
              },
            },
          },
          {
            $sort: {
              "_id.year": 1,
              "_id.month": 1,
            },
          },
        ])
        .toArray();

      return monthlyData.map((item: any) => {
        let inventoryCosts = new Decimal(0);
        let operationalCosts = new Decimal(0);
        let overheadCosts = new Decimal(0);

        item.costs.forEach((cost: any) => {
          const amount = new Decimal(cost.amount || 0);
          switch (cost.type) {
            case "inventory":
              inventoryCosts = inventoryCosts.plus(amount);
              break;
            case "operational":
              operationalCosts = operationalCosts.plus(amount);
              break;
            case "overhead":
              overheadCosts = overheadCosts.plus(amount);
              break;
          }
        });

        const total = inventoryCosts.plus(operationalCosts).plus(overheadCosts);
        const monthName = new Date(
          item._id.year,
          item._id.month - 1
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        });

        return {
          month: monthName,
          inventoryCosts,
          operationalCosts,
          overheadCosts,
          total,
        };
      });
    } catch (error) {
      console.error("Error calculating monthly breakdown:", error);
      return [];
    }
  }

  // Calculate category breakdown
  private async calculateCategoryBreakdown(dateRange?: {
    startDate: Date;
    endDate: Date;
  }): Promise<
    Array<{
      category: string;
      amount: DecimalType;
      percentage: DecimalType;
    }>
  > {
    try {
      const matchStage: any = {};
      if (dateRange) {
        matchStage.createdAt = {
          $gte: dateRange.startDate,
          $lte: dateRange.endDate,
        };
      }

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const categoryData = await db
        .collection("costoperations")
        .aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: "$category",
              totalAmount: { $sum: "$amount" },
            },
          },
          {
            $sort: { totalAmount: -1 },
          },
        ])
        .toArray();

      // Calculate total for percentage calculation
      const grandTotal = categoryData.reduce(
        (sum: DecimalType, item: any) =>
          sum.plus(new Decimal(item.totalAmount || 0)),
        new Decimal(0)
      );

      return categoryData.map((item: any) => {
        const amount = new Decimal(item.totalAmount || 0);
        const percentage = grandTotal.greaterThan(0)
          ? amount.dividedBy(grandTotal).times(100)
          : new Decimal(0);

        return {
          category: item._id || "Uncategorized",
          amount,
          percentage,
        };
      });
    } catch (error) {
      console.error("Error calculating category breakdown:", error);
      return [];
    }
  }

  // Update cost allocation for a product
  async updateCostAllocation(allocation: CostAllocation): Promise<void> {
    try {
      await connectDB();

      // Store cost allocation in product metadata or separate collection
      await Product.findByIdAndUpdate(allocation.productId, {
        $set: {
          "costMetadata.allocation": {
            inventoryPercentage: allocation.inventoryPercentage,
            operationalPercentage: allocation.operationalPercentage,
            overheadPercentage: allocation.overheadPercentage,
            lastUpdated: new Date(),
          },
        },
      });
    } catch (error) {
      console.error("Error updating cost allocation:", error);
      throw error;
    }
  }

  // Calculate profit margins for all products
  async calculateProfitMargins(): Promise<
    Array<{
      productId: string;
      productName: string;
      costPerUnit: DecimalType;
      sellingPrice: DecimalType;
      profitMargin: DecimalType;
      profitAmount: DecimalType;
    }>
  > {
    try {
      await connectDB();

      const products = await Product.find(
        {
          sellingPrice: { $gt: 0 },
        },
        "name costPrice sellingPrice currentQuantity"
      ).lean();

      const profitMargins = await Promise.all(
        products.map(async (product) => {
          const costBreakdown = await this.calculateProductCost(
            product._id.toString()
          );
          const sellingPrice = new Decimal(product.sellingPrice || 0);
          const profitAmount = sellingPrice.minus(
            costBreakdown.costPerUnit || 0
          );
          const profitMargin = sellingPrice.greaterThan(0)
            ? profitAmount.dividedBy(sellingPrice).times(100)
            : new Decimal(0);

          return {
            productId: product._id.toString(),
            productName: product.name,
            costPerUnit: costBreakdown.costPerUnit || new Decimal(0),
            sellingPrice,
            profitMargin,
            profitAmount,
          };
        })
      );

      return profitMargins;
    } catch (error) {
      console.error("Error calculating profit margins:", error);
      return [];
    }
  }
}

// Create and export singleton instance
export const costCalculator = new CostCalculationEngine();

// Utility functions for decimal operations
export const DecimalUtils = {
  // Convert Decimal to number for JSON serialization
  toNumber: (decimal: DecimalType): number => decimal.toNumber(),

  // Convert Decimal to string with fixed decimal places
  toFixed: (decimal: DecimalType, places: number = 2): string =>
    decimal.toFixed(places),

  // Convert number to Decimal
  fromNumber: (num: number): DecimalType => new Decimal(num),

  // Add multiple Decimal values
  sum: (...values: DecimalType[]): DecimalType =>
    values.reduce((sum, val) => sum.plus(val), new Decimal(0)),

  // Format as currency
  toCurrency: (decimal: DecimalType, currency: string = "$"): string =>
    `${currency}${decimal.toFixed(2)}`,
};
