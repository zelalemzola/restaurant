// Profit Margin Service for cost-based calculations
import mongoose from "mongoose";
import { Product } from "@/lib/models";
import { costExpenseService } from "./costExpenseService";
import connectDB from "@/lib/mongodb";

export interface ProfitMarginData {
  productId: string;
  productName: string;
  productType: string;
  costPrice: number;
  sellingPrice: number;
  totalCostPerUnit: number;
  profitMargin: number;
  profitAmount: number;
  profitPercentage: number;
  lastCalculated: Date;
}

export interface ProfitAnalysis {
  totalProducts: number;
  profitableProducts: number;
  unprofitableProducts: number;
  averageProfitMargin: number;
  totalProfitAmount: number;
  highProfitProducts: ProfitMarginData[];
  lowProfitProducts: ProfitMarginData[];
  unprofitableProductsList: ProfitMarginData[];
}

class ProfitMarginService {
  /**
   * Calculate profit margin for a single product using cost price as base cost
   */
  async calculateProductProfitMargin(
    productId: string
  ): Promise<ProfitMarginData | null> {
    try {
      await connectDB();

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      // Use cost price as the base cost for profit calculations
      const costPrice = product.costPrice || 0;
      const sellingPrice = product.sellingPrice || 0;

      // For now, use cost price as total cost per unit
      // In the future, this could include additional operational costs allocated to the product
      const totalCostPerUnit = costPrice;

      // Calculate profit metrics
      const profitAmount = sellingPrice - totalCostPerUnit;
      const profitPercentage =
        sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;
      const profitMargin =
        totalCostPerUnit > 0 ? (profitAmount / totalCostPerUnit) * 100 : 0;

      // Update product with calculated profit margin
      await Product.findByIdAndUpdate(productId, {
        $set: {
          "costMetadata.profitMargin": profitMargin,
          "costMetadata.totalCostImpact": totalCostPerUnit,
          "costMetadata.lastProfitCalculation": new Date(),
        },
      });

      return {
        productId: product._id.toString(),
        productName: product.name,
        productType: product.type,
        costPrice,
        sellingPrice,
        totalCostPerUnit,
        profitMargin,
        profitAmount,
        profitPercentage,
        lastCalculated: new Date(),
      };
    } catch (error) {
      console.error("Error calculating product profit margin:", error);
      throw error;
    }
  }

  /**
   * Calculate profit margins for all products with selling prices
   */
  async calculateAllProductProfitMargins(): Promise<ProfitMarginData[]> {
    try {
      await connectDB();

      const products = await Product.find({
        sellingPrice: { $gt: 0 },
      });

      const profitMargins = await Promise.all(
        products.map(async (product) => {
          try {
            return await this.calculateProductProfitMargin(
              product._id.toString()
            );
          } catch (error) {
            console.error(
              `Error calculating profit for product ${product._id}:`,
              error
            );
            return null;
          }
        })
      );

      return profitMargins.filter(
        (margin): margin is ProfitMarginData => margin !== null
      );
    } catch (error) {
      console.error("Error calculating all product profit margins:", error);
      throw error;
    }
  }

  /**
   * Get comprehensive profit analysis
   */
  async getProfitAnalysis(): Promise<ProfitAnalysis> {
    try {
      const profitMargins = await this.calculateAllProductProfitMargins();

      const totalProducts = profitMargins.length;
      const profitableProducts = profitMargins.filter(
        (p) => p.profitAmount > 0
      ).length;
      const unprofitableProducts = profitMargins.filter(
        (p) => p.profitAmount <= 0
      ).length;

      const totalProfitAmount = profitMargins.reduce(
        (sum, p) => sum + p.profitAmount,
        0
      );
      const averageProfitMargin =
        totalProducts > 0
          ? profitMargins.reduce((sum, p) => sum + p.profitMargin, 0) /
            totalProducts
          : 0;

      // Sort by profit margin for analysis
      const sortedByMargin = [...profitMargins].sort(
        (a, b) => b.profitMargin - a.profitMargin
      );

      const highProfitProducts = sortedByMargin
        .filter((p) => p.profitMargin > 50)
        .slice(0, 10);
      const lowProfitProducts = sortedByMargin
        .filter((p) => p.profitMargin > 0 && p.profitMargin <= 20)
        .slice(0, 10);
      const unprofitableProductsList = sortedByMargin.filter(
        (p) => p.profitAmount <= 0
      );

      return {
        totalProducts,
        profitableProducts,
        unprofitableProducts,
        averageProfitMargin,
        totalProfitAmount,
        highProfitProducts,
        lowProfitProducts,
        unprofitableProductsList,
      };
    } catch (error) {
      console.error("Error getting profit analysis:", error);
      throw error;
    }
  }

  /**
   * Get products with low profit margins (below threshold)
   */
  async getLowProfitMarginProducts(
    threshold: number = 10
  ): Promise<ProfitMarginData[]> {
    try {
      await connectDB();

      const products = await Product.find({
        sellingPrice: { $gt: 0 },
        "costMetadata.profitMargin": { $lt: threshold, $gte: 0 },
      });

      const profitMargins = await Promise.all(
        products.map(async (product) => {
          try {
            return await this.calculateProductProfitMargin(
              product._id.toString()
            );
          } catch (error) {
            console.error(
              `Error calculating profit for product ${product._id}:`,
              error
            );
            return null;
          }
        })
      );

      return profitMargins.filter(
        (margin): margin is ProfitMarginData => margin !== null
      );
    } catch (error) {
      console.error("Error getting low profit margin products:", error);
      throw error;
    }
  }

  /**
   * Update profit margins for products that need recalculation
   */
  async updateStaleProductProfitMargins(
    daysSinceLastCalculation: number = 7
  ): Promise<number> {
    try {
      await connectDB();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastCalculation);

      const staleProducts = await Product.find({
        sellingPrice: { $gt: 0 },
        $or: [
          { "costMetadata.lastProfitCalculation": { $lt: cutoffDate } },
          { "costMetadata.lastProfitCalculation": { $exists: false } },
        ],
      });

      let updatedCount = 0;
      for (const product of staleProducts) {
        try {
          await this.calculateProductProfitMargin(product._id.toString());
          updatedCount++;
        } catch (error) {
          console.error(
            `Error updating profit margin for product ${product._id}:`,
            error
          );
        }
      }

      return updatedCount;
    } catch (error) {
      console.error("Error updating stale product profit margins:", error);
      throw error;
    }
  }

  /**
   * Get profit margin trends over time
   */
  async getProfitMarginTrends(months: number = 6): Promise<any[]> {
    try {
      await connectDB();

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // This would require storing historical profit margin data
      // For now, return current profit margins grouped by product type
      const products = await Product.aggregate([
        {
          $match: {
            sellingPrice: { $gt: 0 },
            "costMetadata.profitMargin": { $exists: true },
          },
        },
        {
          $group: {
            _id: "$type",
            averageProfitMargin: { $avg: "$costMetadata.profitMargin" },
            productCount: { $sum: 1 },
            totalProfitImpact: { $sum: "$costMetadata.totalCostImpact" },
          },
        },
        {
          $sort: { averageProfitMargin: -1 },
        },
      ]);

      return products;
    } catch (error) {
      console.error("Error getting profit margin trends:", error);
      throw error;
    }
  }

  /**
   * Calculate optimal selling price based on desired profit margin
   */
  calculateOptimalSellingPrice(
    costPrice: number,
    desiredProfitMargin: number
  ): number {
    // Profit margin = (Selling Price - Cost Price) / Cost Price * 100
    // Solving for Selling Price: Selling Price = Cost Price * (1 + Profit Margin / 100)
    return costPrice * (1 + desiredProfitMargin / 100);
  }

  /**
   * Get pricing recommendations for products
   */
  async getPricingRecommendations(targetProfitMargin: number = 25): Promise<
    Array<{
      productId: string;
      productName: string;
      currentSellingPrice: number;
      currentProfitMargin: number;
      recommendedSellingPrice: number;
      potentialProfitIncrease: number;
    }>
  > {
    try {
      const profitMargins = await this.calculateAllProductProfitMargins();

      return profitMargins
        .filter((p) => p.profitMargin < targetProfitMargin)
        .map((p) => {
          const recommendedSellingPrice = this.calculateOptimalSellingPrice(
            p.costPrice,
            targetProfitMargin
          );
          const potentialProfitIncrease =
            recommendedSellingPrice - p.sellingPrice;

          return {
            productId: p.productId,
            productName: p.productName,
            currentSellingPrice: p.sellingPrice,
            currentProfitMargin: p.profitMargin,
            recommendedSellingPrice,
            potentialProfitIncrease,
          };
        })
        .sort((a, b) => b.potentialProfitIncrease - a.potentialProfitIncrease);
    } catch (error) {
      console.error("Error getting pricing recommendations:", error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const profitMarginService = new ProfitMarginService();
