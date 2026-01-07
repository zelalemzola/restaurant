import mongoose, { Schema, Document } from "mongoose";

export interface CostTransactionDocument extends Document {
  type: "inventory" | "operational" | "overhead";
  category: string;
  amount: number;
  description: string;
  date: Date;
  relatedEntity?: {
    type: "product" | "operation" | "general";
    id: string;
    name: string;
  };
  metadata?: {
    productQuantity?: number;
    unitCost?: number;
    supplier?: string;
    invoiceNumber?: string;
    paymentMethod?: string;
    tags?: string[];
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CostTransactionSchema = new Schema<CostTransactionDocument>(
  {
    type: {
      type: String,
      enum: ["inventory", "operational", "overhead"],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    relatedEntity: {
      type: {
        type: String,
        enum: ["product", "operation", "general"],
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
      },
    },
    metadata: {
      productQuantity: { type: Number, min: 0 },
      unitCost: { type: Number, min: 0 },
      supplier: { type: String, trim: true },
      invoiceNumber: { type: String, trim: true },
      paymentMethod: { type: String, trim: true },
      tags: [{ type: String, trim: true }],
    },
    createdBy: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
CostTransactionSchema.index({ type: 1, date: -1 });
CostTransactionSchema.index({ category: 1, date: -1 });
CostTransactionSchema.index({ "relatedEntity.type": 1, "relatedEntity.id": 1 });
CostTransactionSchema.index({ createdBy: 1, date: -1 });
CostTransactionSchema.index({ date: -1, amount: -1 });

// Static methods for cost analysis
CostTransactionSchema.statics.getCostSummaryByType = function (
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = {};
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = startDate;
    if (endDate) matchStage.date.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
        avgAmount: { $avg: "$amount" },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

CostTransactionSchema.statics.getCostSummaryByCategory = function (
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = {};
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = startDate;
    if (endDate) matchStage.date.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { type: "$type", category: "$category" },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
        avgAmount: { $avg: "$amount" },
      },
    },
    {
      $group: {
        _id: "$_id.type",
        categories: {
          $push: {
            category: "$_id.category",
            totalAmount: "$totalAmount",
            count: "$count",
            avgAmount: "$avgAmount",
          },
        },
        typeTotal: { $sum: "$totalAmount" },
      },
    },
    { $sort: { typeTotal: -1 } },
  ]);
};

CostTransactionSchema.statics.getMonthlyTrend = function (months: number = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    { $match: { date: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: "$date" },
          month: { $month: "$date" },
          type: "$type",
        },
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
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

CostTransactionSchema.statics.getProductCosts = function (
  productId: string,
  startDate?: Date,
  endDate?: Date
) {
  const matchStage: any = {
    "relatedEntity.type": "product",
    "relatedEntity.id": productId,
  };

  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = startDate;
    if (endDate) matchStage.date.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
        transactions: { $push: "$$ROOT" },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

// Instance methods
CostTransactionSchema.methods.addToProductCostHistory = async function () {
  if (this.relatedEntity?.type === "product" && this.relatedEntity?.id) {
    const Product = mongoose.model("Product");
    const product = await Product.findById(this.relatedEntity.id);

    if (product && product.addCostHistoryEntry) {
      const unitCost =
        this.metadata?.unitCost ||
        (this.metadata?.productQuantity
          ? this.amount / this.metadata.productQuantity
          : this.amount);
      product.addCostHistoryEntry(
        unitCost,
        `${this.type} cost: ${this.description}`,
        this.createdBy
      );
      await product.save();
    }
  }
};

// Pre-save middleware to automatically add to product cost history
CostTransactionSchema.pre(
  "save",
  async function (this: CostTransactionDocument) {
    if (this.isNew && this.relatedEntity?.type === "product") {
      try {
        // Call the instance method directly
        if (this.relatedEntity?.id) {
          const Product = mongoose.model("Product");
          const product = await Product.findById(this.relatedEntity.id);

          if (product && product.addCostHistoryEntry) {
            const unitCost =
              this.metadata?.unitCost ||
              (this.metadata?.productQuantity
                ? this.amount / this.metadata.productQuantity
                : this.amount);
            product.addCostHistoryEntry(
              unitCost,
              `${this.type} cost: ${this.description}`,
              this.createdBy
            );
            await product.save();
          }
        }
      } catch (error) {
        console.error("Error adding to product cost history:", error);
        // Don't fail the save operation, just log the error
      }
    }
  }
);

export default mongoose.models.CostTransaction ||
  mongoose.model<CostTransactionDocument>(
    "CostTransaction",
    CostTransactionSchema
  );
