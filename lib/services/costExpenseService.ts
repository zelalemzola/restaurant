// Cost Expense Service for automatic cost price recording
import mongoose from "mongoose";
import CostExpense from "@/lib/models/CostExpense";
import { Product } from "@/lib/models";
import connectDB from "@/lib/mongodb";

export interface CostExpenseEntry {
  productId: string;
  costPrice: number;
  quantity: number;
  totalCost: number;
  expenseCategory: "inventory" | "operational" | "overhead";
  recordedAt: Date;
  updatedBy?: string;
  reason?: string;
}

export interface CostExpenseOptions {
  category?: "inventory" | "operational" | "overhead";
  updatedBy?: string;
  reason?: string;
}

class CostExpenseService {
  /**
   * Record cost price as expense entry
   */
  async recordCostAsExpense(
    productId: string,
    costPrice: number,
    quantity: number,
    options: CostExpenseOptions = {}
  ): Promise<any> {
    try {
      await connectDB();

      // Get product details
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const totalAmount = costPrice * quantity;
      const category = options.category || "inventory";

      // Create cost expense entry
      const costExpense = new CostExpense({
        productId: new mongoose.Types.ObjectId(productId),
        costPrice,
        quantity,
        totalAmount,
        expenseType: "product_cost",
        category,
        recordedAt: new Date(),
        updatedBy: options.updatedBy,
        metadata: {
          productName: product.name,
          productType: product.type,
          costPerUnit: costPrice,
          previousCostPrice:
            product.costMetadata?.costHistory?.slice(-1)[0]?.costPrice,
          reason: options.reason || "Cost price updated",
        },
      });

      await costExpense.save();

      return costExpense;
    } catch (error) {
      console.error("Error recording cost as expense:", error);
      throw error;
    }
  }

  /**
   * Record cost expense when product cost price is updated
   */
  async recordProductCostUpdate(
    productId: string,
    newCostPrice: number,
    previousCostPrice: number,
    quantity: number,
    options: CostExpenseOptions = {}
  ): Promise<any> {
    try {
      await connectDB();

      // Only record if cost price actually changed
      if (newCostPrice === previousCostPrice) {
        return null;
      }

      // Get product details
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product with ID ${productId} not found`);
      }

      const totalAmount = newCostPrice * quantity;
      const category = options.category || "inventory";

      // Create cost expense entry
      const costExpense = new CostExpense({
        productId: new mongoose.Types.ObjectId(productId),
        costPrice: newCostPrice,
        quantity,
        totalAmount,
        expenseType: "product_cost",
        category,
        recordedAt: new Date(),
        updatedBy: options.updatedBy,
        metadata: {
          productName: product.name,
          productType: product.type,
          costPerUnit: newCostPrice,
          previousCostPrice,
          reason:
            options.reason ||
            `Cost price updated from $${previousCostPrice} to $${newCostPrice}`,
        },
      });

      await costExpense.save();

      return costExpense;
    } catch (error) {
      console.error("Error recording product cost update:", error);
      throw error;
    }
  }

  /**
   * Get cost expenses for a specific product
   */
  async getProductCostExpenses(
    productId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      await connectDB();

      const matchStage: any = {
        productId: new mongoose.Types.ObjectId(productId),
      };
      if (startDate || endDate) {
        matchStage.recordedAt = {};
        if (startDate) matchStage.recordedAt.$gte = startDate;
        if (endDate) matchStage.recordedAt.$lte = endDate;
      }

      const expenses = await CostExpense.find(matchStage)
        .sort({ recordedAt: -1 })
        .populate("productId", "name type");

      return expenses;
    } catch (error) {
      console.error("Error getting product cost expenses:", error);
      throw error;
    }
  }

  /**
   * Get cost expense summary by category
   */
  async getCostExpenseSummary(
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    try {
      await connectDB();

      const matchStage: any = {};
      if (startDate || endDate) {
        matchStage.recordedAt = {};
        if (startDate) matchStage.recordedAt.$gte = startDate;
        if (endDate) matchStage.recordedAt.$lte = endDate;
      }

      const summary = await CostExpense.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
            avgAmount: { $avg: "$totalAmount" },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]);

      return summary;
    } catch (error) {
      console.error("Error getting cost expense summary:", error);
      throw error;
    }
  }

  /**
   * Get monthly cost expense trend
   */
  async getMonthlyExpenseTrend(months: number = 12): Promise<any[]> {
    try {
      await connectDB();

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const trend = await CostExpense.aggregate([
        { $match: { recordedAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              year: { $year: "$recordedAt" },
              month: { $month: "$recordedAt" },
              category: "$category",
            },
            totalAmount: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: {
              year: "$_id.year",
              month: "$_id.month",
            },
            expenses: {
              $push: {
                category: "$_id.category",
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

      return trend;
    } catch (error) {
      console.error("Error getting monthly expense trend:", error);
      throw error;
    }
  }

  /**
   * Calculate total cost expenses for financial reporting
   */
  async getTotalCostExpenses(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalInventoryExpenses: number;
    totalOperationalExpenses: number;
    totalOverheadExpenses: number;
    grandTotal: number;
  }> {
    try {
      await connectDB();

      const matchStage: any = {};
      if (startDate || endDate) {
        matchStage.recordedAt = {};
        if (startDate) matchStage.recordedAt.$gte = startDate;
        if (endDate) matchStage.recordedAt.$lte = endDate;
      }

      const summary = await CostExpense.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$totalAmount" },
          },
        },
      ]);

      let totalInventoryExpenses = 0;
      let totalOperationalExpenses = 0;
      let totalOverheadExpenses = 0;

      summary.forEach((item: any) => {
        switch (item._id) {
          case "inventory":
            totalInventoryExpenses = item.totalAmount;
            break;
          case "operational":
            totalOperationalExpenses = item.totalAmount;
            break;
          case "overhead":
            totalOverheadExpenses = item.totalAmount;
            break;
        }
      });

      const grandTotal =
        totalInventoryExpenses +
        totalOperationalExpenses +
        totalOverheadExpenses;

      return {
        totalInventoryExpenses,
        totalOperationalExpenses,
        totalOverheadExpenses,
        grandTotal,
      };
    } catch (error) {
      console.error("Error calculating total cost expenses:", error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const costExpenseService = new CostExpenseService();
