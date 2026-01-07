// Cost Expense model for automatic cost price recording
import mongoose, { Schema, Document } from "mongoose";

export interface CostExpenseDocument extends Document {
  productId: mongoose.Types.ObjectId;
  costPrice: number;
  quantity: number;
  totalAmount: number;
  expenseType: "product_cost";
  category: "inventory" | "operational" | "overhead";
  recordedAt: Date;
  updatedBy?: string;
  metadata: {
    productName: string;
    productType: string;
    costPerUnit: number;
    previousCostPrice?: number;
    reason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CostExpenseSchema = new Schema<CostExpenseDocument>(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    costPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    expenseType: {
      type: String,
      enum: ["product_cost"],
      required: true,
      default: "product_cost",
    },
    category: {
      type: String,
      enum: ["inventory", "operational", "overhead"],
      required: true,
      default: "inventory",
    },
    recordedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    updatedBy: {
      type: String,
      trim: true,
    },
    metadata: {
      productName: {
        type: String,
        required: true,
        trim: true,
      },
      productType: {
        type: String,
        required: true,
        trim: true,
      },
      costPerUnit: {
        type: Number,
        required: true,
        min: 0,
      },
      previousCostPrice: {
        type: Number,
        min: 0,
      },
      reason: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
CostExpenseSchema.index({ productId: 1, recordedAt: -1 });
CostExpenseSchema.index({ category: 1, recordedAt: -1 });
CostExpenseSchema.index({ expenseType: 1, recordedAt: -1 });
CostExpenseSchema.index({ recordedAt: -1, totalAmount: -1 });

// Static methods for cost expense analysis
CostExpenseSchema.statics.getExpenseSummaryByCategory = function (
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = {};
  if (startDate || endDate) {
    matchStage.recordedAt = {};
    if (startDate) matchStage.recordedAt.$gte = startDate;
    if (endDate) matchStage.recordedAt.$lte = endDate;
  }

  return this.aggregate([
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
};

CostExpenseSchema.statics.getProductExpenseHistory = function (
  productId: string,
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = { productId: new mongoose.Types.ObjectId(productId) };
  if (startDate || endDate) {
    matchStage.recordedAt = {};
    if (startDate) matchStage.recordedAt.$gte = startDate;
    if (endDate) matchStage.recordedAt.$lte = endDate;
  }

  return this.find(matchStage)
    .sort({ recordedAt: -1 })
    .populate("productId", "name type");
};

CostExpenseSchema.statics.getMonthlyExpenseTrend = function (
  months: number = 12
) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
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
};

export default mongoose.models.CostExpense ||
  mongoose.model<CostExpenseDocument>("CostExpense", CostExpenseSchema);
