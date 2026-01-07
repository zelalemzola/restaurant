// Product Mongoose model
import mongoose, { Schema, Document } from "mongoose";
import { Product } from "@/types";

export interface CostHistoryEntry {
  date: Date;
  costPrice: number;
  reason?: string;
  updatedBy?: string;
}

export interface CostAllocationData {
  inventoryPercentage: number;
  operationalPercentage: number;
  overheadPercentage: number;
  lastUpdated: Date;
}

export interface CostMetadata {
  lastCostUpdate: Date;
  costHistory: CostHistoryEntry[];
  allocation?: CostAllocationData;
  totalCostImpact?: number; // Total cost impact including operational and overhead
  profitMargin?: number; // Calculated profit margin percentage
  lastProfitCalculation?: Date;
}

export interface ProductDocument extends Omit<Product, "_id">, Document {
  costMetadata?: CostMetadata;
}

const CostHistorySchema = new Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    costPrice: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true },
    updatedBy: { type: String, trim: true },
  },
  { _id: false }
);

const CostAllocationSchema = new Schema(
  {
    inventoryPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 100,
    },
    operationalPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    overheadPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    lastUpdated: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const CostMetadataSchema = new Schema(
  {
    lastCostUpdate: { type: Date, default: Date.now },
    costHistory: [CostHistorySchema],
    allocation: CostAllocationSchema,
    totalCostImpact: { type: Number, min: 0 },
    profitMargin: { type: Number },
    lastProfitCalculation: { type: Date },
  },
  { _id: false }
);

const ProductSchema = new Schema<ProductDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductGroup",
      required: true,
    },
    type: {
      type: String,
      enum: ["stock", "sellable", "combination"],
      required: true,
    },
    metric: {
      type: String,
      required: true,
      trim: true,
    },
    currentQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    minStockLevel: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      min: 0,
    },
    stockTrackingEnabled: {
      type: Boolean,
      default: true, // Enable stock tracking by default for all products
    },
    costMetadata: {
      type: CostMetadataSchema,
      default: () => ({
        lastCostUpdate: new Date(),
        costHistory: [],
        allocation: {
          inventoryPercentage: 100,
          operationalPercentage: 0,
          overheadPercentage: 0,
          lastUpdated: new Date(),
        },
      }),
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to update cost history when cost price changes
ProductSchema.pre("save", async function () {
  if (this.isModified("costPrice") && this.costPrice !== undefined) {
    // Initialize costMetadata if it doesn't exist
    if (!this.costMetadata) {
      this.costMetadata = {
        lastCostUpdate: new Date(),
        costHistory: [],
        allocation: {
          inventoryPercentage: 100,
          operationalPercentage: 0,
          overheadPercentage: 0,
          lastUpdated: new Date(),
        },
      };
    }

    // Get previous cost price for expense recording
    const previousCostPrice =
      this.costMetadata.costHistory.length > 0
        ? this.costMetadata.costHistory[
            this.costMetadata.costHistory.length - 1
          ].costPrice
        : 0;

    // Add to cost history
    this.costMetadata.costHistory.push({
      date: new Date(),
      costPrice: this.costPrice,
      reason: "Cost price updated",
    });

    // Update last cost update timestamp
    this.costMetadata.lastCostUpdate = new Date();

    // Keep only last 50 cost history entries to prevent document bloat
    if (this.costMetadata.costHistory.length > 50) {
      this.costMetadata.costHistory = this.costMetadata.costHistory.slice(-50);
    }

    // Record cost as expense (async operation, don't block save)
    if (this.isNew || previousCostPrice !== this.costPrice) {
      setImmediate(async () => {
        try {
          const { costExpenseService } = await import(
            "@/lib/services/costExpenseService"
          );
          await costExpenseService.recordProductCostUpdate(
            this._id.toString(),
            this.costPrice!,
            previousCostPrice,
            this.currentQuantity || 0,
            {
              category: "inventory",
              reason: this.isNew
                ? "Initial cost price set"
                : "Cost price updated",
            }
          );
        } catch (error) {
          console.error("Error recording cost expense:", error);
          // Don't fail the save operation, just log the error
        }
      });
    }
  }

  // Calculate profit margin when cost price or selling price changes
  if (
    (this.isModified("costPrice") || this.isModified("sellingPrice")) &&
    this.costPrice !== undefined &&
    this.sellingPrice !== undefined &&
    this.sellingPrice > 0
  ) {
    const costPrice = this.costPrice || 0;
    const sellingPrice = this.sellingPrice;
    const profitAmount = sellingPrice - costPrice;
    const profitMargin = costPrice > 0 ? (profitAmount / costPrice) * 100 : 0;

    // Update profit margin in costMetadata
    if (!this.costMetadata) {
      this.costMetadata = {
        lastCostUpdate: new Date(),
        costHistory: [],
        allocation: {
          inventoryPercentage: 100,
          operationalPercentage: 0,
          overheadPercentage: 0,
          lastUpdated: new Date(),
        },
      };
    }

    this.costMetadata.profitMargin = profitMargin;
    this.costMetadata.totalCostImpact = costPrice;
    this.costMetadata.lastProfitCalculation = new Date();
  }
});

// Post-save middleware to check stock levels and trigger notifications
ProductSchema.post("save", async function (doc) {
  // Check if currentQuantity or minStockLevel was modified
  if (this.isModified("currentQuantity") || this.isModified("minStockLevel")) {
    // Trigger low stock monitoring check (async, don't block)
    setImmediate(async () => {
      try {
        const { lowStockMonitor } = await import(
          "@/lib/services/lowStockMonitor"
        );
        await lowStockMonitor.checkProductStockLevel(doc._id.toString());
      } catch (error) {
        console.error("Error checking stock level after product save:", error);
      }
    });
  }
});

// Instance method to add cost history entry
ProductSchema.methods.addCostHistoryEntry = function (
  costPrice: number,
  reason?: string,
  updatedBy?: string
) {
  if (!this.costMetadata) {
    this.costMetadata = {
      lastCostUpdate: new Date(),
      costHistory: [],
      allocation: {
        inventoryPercentage: 100,
        operationalPercentage: 0,
        overheadPercentage: 0,
        lastUpdated: new Date(),
      },
    };
  }

  this.costMetadata.costHistory.push({
    date: new Date(),
    costPrice,
    reason,
    updatedBy,
  });

  this.costMetadata.lastCostUpdate = new Date();

  // Keep only last 50 entries
  if (this.costMetadata.costHistory.length > 50) {
    this.costMetadata.costHistory = this.costMetadata.costHistory.slice(-50);
  }
};

// Instance method to update cost allocation
ProductSchema.methods.updateCostAllocation = function (
  inventoryPercentage: number,
  operationalPercentage: number,
  overheadPercentage: number
) {
  // Validate percentages sum to 100
  const total =
    inventoryPercentage + operationalPercentage + overheadPercentage;
  if (Math.abs(total - 100) > 0.01) {
    throw new Error("Cost allocation percentages must sum to 100%");
  }

  if (!this.costMetadata) {
    this.costMetadata = {
      lastCostUpdate: new Date(),
      costHistory: [],
    };
  }

  this.costMetadata.allocation = {
    inventoryPercentage,
    operationalPercentage,
    overheadPercentage,
    lastUpdated: new Date(),
  };
};

// Instance method to update profit margin
ProductSchema.methods.updateProfitMargin = function (
  profitMargin: number,
  totalCostImpact?: number
) {
  if (!this.costMetadata) {
    this.costMetadata = {
      lastCostUpdate: new Date(),
      costHistory: [],
      allocation: {
        inventoryPercentage: 100,
        operationalPercentage: 0,
        overheadPercentage: 0,
        lastUpdated: new Date(),
      },
    };
  }

  this.costMetadata.profitMargin = profitMargin;
  this.costMetadata.lastProfitCalculation = new Date();

  if (totalCostImpact !== undefined) {
    this.costMetadata.totalCostImpact = totalCostImpact;
  }
};

// Static method to get products with low profit margins
ProductSchema.statics.findLowProfitMarginProducts = function (
  threshold: number = 10
) {
  return this.find({
    "costMetadata.profitMargin": { $lt: threshold, $gte: 0 },
  }).populate("groupId", "name");
};

// Static method to get products needing cost recalculation
ProductSchema.statics.findProductsNeedingCostRecalculation = function (
  daysSinceLastCalculation: number = 7
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastCalculation);

  return this.find({
    $or: [
      { "costMetadata.lastProfitCalculation": { $lt: cutoffDate } },
      { "costMetadata.lastProfitCalculation": { $exists: false } },
    ],
  });
};

// Create indexes
ProductSchema.index({ groupId: 1 });
ProductSchema.index({ type: 1 });
ProductSchema.index({ currentQuantity: 1 });
ProductSchema.index({ name: 1 });
ProductSchema.index({ minStockLevel: 1 });
ProductSchema.index({ "costMetadata.profitMargin": 1 });
ProductSchema.index({ "costMetadata.lastProfitCalculation": 1 });
ProductSchema.index({ "costMetadata.lastCostUpdate": 1 });

export default mongoose.models.Product ||
  mongoose.model<ProductDocument>("Product", ProductSchema);
