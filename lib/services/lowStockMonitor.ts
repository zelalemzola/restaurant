import connectDB from "@/lib/mongodb";
import { Product } from "@/lib/models";
import { eventBroadcaster } from "./eventBroadcaster";
import mongoose from "mongoose";

export interface LowStockItem {
  _id: string;
  name: string;
  currentQuantity: number;
  minStockLevel: number;
  metric: string;
  type: string;
  groupId?: {
    _id: string;
    name: string;
  };
  urgencyLevel: "critical" | "warning" | "low";
  suggestedRestock: number;
  lastRestocked?: Date;
  daysUntilEmpty?: number;
  costPrice?: number;
  sellingPrice?: number;
}

export interface RestockSuggestion {
  productId: string;
  currentQuantity: number;
  suggestedQuantity: number;
  estimatedCost: number;
  priority: "high" | "medium" | "low";
  reason: string;
}

class LowStockMonitoringService {
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  // Get all low stock items
  async getLowStockItems(): Promise<LowStockItem[]> {
    try {
      await connectDB();

      const lowStockProducts = await Product.find({
        $expr: {
          $lte: ["$currentQuantity", "$minStockLevel"],
        },
        stockTrackingEnabled: { $ne: false }, // Only include products with stock tracking enabled
      })
        .populate("groupId", "name")
        .sort({ currentQuantity: 1 })
        .lean()
        .exec();

      return lowStockProducts.map((product) =>
        this.enrichLowStockItem(product)
      );
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      return [];
    }
  }

  // Get low stock items with specific urgency level
  async getLowStockItemsByUrgency(
    urgency: "critical" | "warning" | "low"
  ): Promise<LowStockItem[]> {
    const allLowStockItems = await this.getLowStockItems();
    return allLowStockItems.filter((item) => item.urgencyLevel === urgency);
  }

  // Get critical stock items (quantity is 0 or very low)
  async getCriticalStockItems(): Promise<LowStockItem[]> {
    try {
      await connectDB();

      const criticalProducts = await Product.find({
        $and: [
          { stockTrackingEnabled: { $ne: false } }, // Only include products with stock tracking enabled
          {
            $or: [
              { currentQuantity: 0 },
              {
                $expr: {
                  $lte: [
                    "$currentQuantity",
                    { $multiply: ["$minStockLevel", 0.2] },
                  ],
                },
              },
            ],
          },
        ],
      })
        .populate("groupId", "name")
        .sort({ currentQuantity: 1 })
        .lean()
        .exec();

      return criticalProducts.map((product) =>
        this.enrichLowStockItem(product)
      );
    } catch (error) {
      console.error("Error fetching critical stock items:", error);
      return [];
    }
  }

  // Enrich low stock item with additional data
  private enrichLowStockItem(product: any): LowStockItem {
    const urgencyLevel = this.calculateUrgencyLevel(
      product.currentQuantity,
      product.minStockLevel
    );
    const suggestedRestock = this.calculateSuggestedRestock(product);
    const daysUntilEmpty = this.estimateDaysUntilEmpty(product);

    return {
      _id: product._id.toString(),
      name: product.name,
      currentQuantity: product.currentQuantity,
      minStockLevel: product.minStockLevel,
      metric: product.metric,
      type: product.type,
      groupId: product.groupId,
      urgencyLevel,
      suggestedRestock,
      lastRestocked: product.lastRestocked,
      daysUntilEmpty,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
    };
  }

  // Calculate urgency level based on current vs minimum stock
  private calculateUrgencyLevel(
    currentQuantity: number,
    minStockLevel: number
  ): "critical" | "warning" | "low" {
    if (currentQuantity === 0) {
      return "critical";
    }

    const ratio = currentQuantity / minStockLevel;

    if (ratio <= 0.2) {
      return "critical";
    } else if (ratio <= 0.5) {
      return "warning";
    } else {
      return "low";
    }
  }

  // Calculate suggested restock quantity
  private calculateSuggestedRestock(product: any): number {
    const { currentQuantity, minStockLevel, type } = product;

    // Base restock calculation
    let suggestedQuantity = minStockLevel * 2 - currentQuantity;

    // Adjust based on product type
    switch (type) {
      case "sellable":
        // For sellable items, suggest higher stock levels
        suggestedQuantity = Math.max(suggestedQuantity, minStockLevel * 3);
        break;
      case "ingredient":
        // For ingredients, be more conservative
        suggestedQuantity = Math.max(suggestedQuantity, minStockLevel * 1.5);
        break;
      default:
        // Default case
        suggestedQuantity = Math.max(suggestedQuantity, minStockLevel * 2);
    }

    // Ensure minimum restock of 1
    return Math.max(Math.ceil(suggestedQuantity), 1);
  }

  // Estimate days until stock runs out (simplified calculation)
  private estimateDaysUntilEmpty(product: any): number | undefined {
    // This is a simplified calculation
    // In a real system, you'd use historical usage data
    const { currentQuantity, minStockLevel } = product;

    if (currentQuantity === 0) {
      return 0;
    }

    // Assume average daily usage is 10% of minimum stock level
    const estimatedDailyUsage = minStockLevel * 0.1;

    if (estimatedDailyUsage <= 0) {
      return undefined;
    }

    return Math.floor(currentQuantity / estimatedDailyUsage);
  }

  // Restock a specific item
  async restockItem(
    productId: string,
    quantity: number,
    reason?: string
  ): Promise<boolean> {
    try {
      await connectDB();

      const product = await Product.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      const oldQuantity = product.currentQuantity;
      product.currentQuantity += quantity;
      product.lastRestocked = new Date();

      await product.save();

      // Create stock transaction record
      const { StockTransaction } = await import("@/lib/models");
      await StockTransaction.create({
        productId: product._id,
        type: "addition",
        quantity: quantity,
        previousQuantity: oldQuantity,
        newQuantity: product.currentQuantity,
        reason: reason || "Inventory restock",
        userId: "507f1f77bcf86cd799439011", // System user placeholder
      });

      // Create cost expense record if product has cost price
      if (product.costPrice && product.costPrice > 0) {
        const { costExpenseService } = await import(
          "@/lib/services/costExpenseService"
        );
        await costExpenseService.recordCostAsExpense(
          productId,
          product.costPrice,
          quantity,
          {
            category: "inventory",
            reason: reason || "Inventory restock",
          }
        );
      }

      // Clean up low stock notifications if product is now above minimum threshold
      if (product.currentQuantity > product.minStockLevel) {
        const { notificationService } = await import(
          "@/lib/services/NotificationService"
        );
        await notificationService.cleanupResolvedLowStockNotifications(
          productId
        );
      }

      // Broadcast inventory update
      eventBroadcaster.broadcastQuantityChanged(
        productId,
        product.currentQuantity,
        quantity,
        "restock"
      );

      // Create notification for restock
      const { notificationService } = await import(
        "@/lib/services/NotificationService"
      );
      await notificationService.createInventoryNotification(
        product.toObject(),
        oldQuantity,
        product.currentQuantity,
        "restock"
      );

      return true;
    } catch (error) {
      console.error("Error restocking item:", error);
      return false;
    }
  }

  // Batch restock multiple items
  async batchRestock(
    restockItems: Array<{
      productId: string;
      quantity: number;
      reason?: string;
    }>
  ): Promise<{
    successful: string[];
    failed: Array<{ productId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ productId: string; error: string }> = [];

    for (const item of restockItems) {
      try {
        const success = await this.restockItem(
          item.productId,
          item.quantity,
          item.reason
        );
        if (success) {
          successful.push(item.productId);
        } else {
          failed.push({
            productId: item.productId,
            error: "Restock operation failed",
          });
        }
      } catch (error) {
        failed.push({
          productId: item.productId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { successful, failed };
  }

  // Get restock suggestions based on usage patterns
  async getRestockSuggestions(): Promise<RestockSuggestion[]> {
    try {
      const lowStockItems = await this.getLowStockItems();

      return lowStockItems.map((item) => {
        const estimatedCost = (item.costPrice || 0) * item.suggestedRestock;
        let priority: "high" | "medium" | "low" = "medium";
        let reason = "Stock below minimum level";

        // Determine priority and reason
        switch (item.urgencyLevel) {
          case "critical":
            priority = "high";
            reason =
              item.currentQuantity === 0
                ? "Out of stock"
                : "Critically low stock";
            break;
          case "warning":
            priority = "medium";
            reason = "Stock level warning";
            break;
          case "low":
            priority = "low";
            reason = "Stock below minimum threshold";
            break;
        }

        return {
          productId: item._id,
          currentQuantity: item.currentQuantity,
          suggestedQuantity: item.suggestedRestock,
          estimatedCost,
          priority,
          reason,
        };
      });
    } catch (error) {
      console.error("Error generating restock suggestions:", error);
      return [];
    }
  }

  // Update stock thresholds for a product
  async updateStockThreshold(
    productId: string,
    newMinStockLevel: number
  ): Promise<boolean> {
    try {
      await connectDB();

      const product = await Product.findByIdAndUpdate(
        productId,
        { minStockLevel: newMinStockLevel },
        { new: true }
      );

      if (!product) {
        return false;
      }

      // Broadcast product update
      eventBroadcaster.broadcastProductUpdated(product.toObject());

      return true;
    } catch (error) {
      console.error("Error updating stock threshold:", error);
      return false;
    }
  }

  // Start monitoring for low stock items
  startMonitoring(intervalMinutes: number = 30): void {
    if (this.isMonitoring) {
      console.log("Low stock monitoring is already running");
      return;
    }

    this.isMonitoring = true;

    // Initial check
    this.performMonitoringCheck();

    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCheck();
    }, intervalMinutes * 60 * 1000);

    console.log(
      `Low stock monitoring started (checking every ${intervalMinutes} minutes)`
    );
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log("Low stock monitoring stopped");
  }

  // Perform a monitoring check
  private async performMonitoringCheck(): Promise<void> {
    try {
      const lowStockItems = await this.getLowStockItems();
      const { notificationService } = await import(
        "@/lib/services/NotificationService"
      );

      // Process each low stock item
      for (const item of lowStockItems) {
        // Check if we already have an active notification for this product
        const existingNotifications =
          await notificationService.getActiveLowStockNotifications();
        const hasActiveNotification = existingNotifications.some(
          (notification) => notification.data?.productId === item._id
        );

        // Only create notification if we don't already have one
        if (!hasActiveNotification) {
          await notificationService.createLowStockNotification(
            item._id,
            item.name,
            item.currentQuantity,
            item.minStockLevel,
            item.metric,
            item.urgencyLevel
          );
        }
      }

      // Clean up notifications for products that are no longer low stock
      await this.cleanupResolvedNotifications(lowStockItems);

      console.log(
        `Low stock monitoring check completed. Found ${lowStockItems.length} low stock items.`
      );
    } catch (error) {
      console.error("Error during monitoring check:", error);
    }
  }

  // Clean up notifications for products that are no longer low stock
  private async cleanupResolvedNotifications(
    currentLowStockItems: LowStockItem[]
  ): Promise<void> {
    try {
      const { notificationService } = await import(
        "@/lib/services/NotificationService"
      );

      // Get all active low stock notifications
      const activeNotifications =
        await notificationService.getActiveLowStockNotifications();

      // Find notifications for products that are no longer low stock
      const currentLowStockIds = new Set(
        currentLowStockItems.map((item) => item._id)
      );

      for (const notification of activeNotifications) {
        const productId = notification.data?.productId;
        if (productId && !currentLowStockIds.has(productId)) {
          // This product is no longer low stock, clean up its notifications
          await notificationService.cleanupResolvedLowStockNotifications(
            productId
          );
        }
      }
    } catch (error) {
      console.error("Error cleaning up resolved notifications:", error);
    }
  }

  // Check and create low stock notification for a specific product
  async checkProductStockLevel(productId: string): Promise<void> {
    try {
      await connectDB();

      const product = await Product.findById(productId).lean();
      if (!product || !product.stockTrackingEnabled) {
        return;
      }

      const { notificationService } = await import(
        "@/lib/services/NotificationService"
      );

      // Check if product is low stock
      if (product.currentQuantity <= product.minStockLevel) {
        const urgencyLevel = this.calculateUrgencyLevel(
          product.currentQuantity,
          product.minStockLevel
        );

        // Check if we already have an active notification for this product
        const existingNotifications =
          await notificationService.getActiveLowStockNotifications();
        const hasActiveNotification = existingNotifications.some(
          (notification) => notification.data?.productId === productId
        );

        // Only create notification if we don't already have one
        if (!hasActiveNotification) {
          await notificationService.createLowStockNotification(
            productId,
            product.name,
            product.currentQuantity,
            product.minStockLevel,
            product.metric,
            urgencyLevel
          );
        }
      } else {
        // Product is no longer low stock, clean up any existing notifications
        await notificationService.cleanupResolvedLowStockNotifications(
          productId
        );
      }
    } catch (error) {
      console.error("Error checking product stock level:", error);
    }
  }

  // Trigger stock level check for multiple products
  async checkMultipleProductStockLevels(productIds: string[]): Promise<void> {
    for (const productId of productIds) {
      await this.checkProductStockLevel(productId);
    }
  }

  // Get monitoring status
  getMonitoringStatus(): { isMonitoring: boolean; intervalMinutes?: number } {
    return {
      isMonitoring: this.isMonitoring,
    };
  }
}

// Create and export singleton instance
export const lowStockMonitor = new LowStockMonitoringService();

// Initialize monitoring (call this in your app startup)
export function initializeLowStockMonitoring(intervalMinutes: number = 30) {
  lowStockMonitor.startMonitoring(intervalMinutes);
}

// Cleanup function (call this on app shutdown)
export function cleanupLowStockMonitoring() {
  lowStockMonitor.stopMonitoring();
}
