// Notification utility functions
import { Product } from "@/lib/models";
import { notificationService } from "@/lib/services/NotificationService";
import connectDB from "@/lib/mongodb";

export interface LowStockCheckResult {
  lowStockProducts: Array<{
    product: any;
    currentQuantity: number;
    minStockLevel: number;
  }>;
  notificationsCreated: number;
}

/**
 * Check for products with low stock and create notifications
 */
export async function checkAndCreateLowStockNotifications(): Promise<LowStockCheckResult> {
  await connectDB();

  // Find products that are at or below minimum stock level (all types with stock tracking enabled)
  const lowStockProducts = await Product.find({
    $expr: { $lte: ["$currentQuantity", "$minStockLevel"] },
    stockTrackingEnabled: { $ne: false }, // Include products where stockTrackingEnabled is true or undefined (default)
  }).populate("groupId", "name");

  const result: LowStockCheckResult = {
    lowStockProducts: [],
    notificationsCreated: 0,
  };

  for (const product of lowStockProducts) {
    // Check if we already have an unread low-stock notification for this product
    const existingNotifications = await notificationService.getNotifications(
      "system",
      {
        unreadOnly: true,
        category: "inventory",
      }
    );

    const hasExistingLowStockNotification = existingNotifications.some(
      (notification) =>
        notification.type === "low_stock" &&
        notification.data?.productId === product._id.toString()
    );

    // Only create a new notification if one doesn't already exist
    if (!hasExistingLowStockNotification) {
      await notificationService.createNotification({
        type: "low_stock",
        title: `Low Stock Alert: ${product.name}`,
        message: `${product.name} is running low. Current stock: ${product.currentQuantity} ${product.metric}, Minimum level: ${product.minStockLevel} ${product.metric}`,
        data: {
          productId: product._id.toString(),
          productName: product.name,
          currentQuantity: product.currentQuantity,
          minStockLevel: product.minStockLevel,
          metric: product.metric,
        },
        userId: "system",
        priority: "high",
        category: "inventory",
      });
      result.notificationsCreated++;
    }

    result.lowStockProducts.push({
      product,
      currentQuantity: product.currentQuantity,
      minStockLevel: product.minStockLevel,
    });
  }

  return result;
}

/**
 * Check if a specific product needs a low stock notification after quantity change
 */
export async function checkProductLowStock(
  productId: string
): Promise<boolean> {
  await connectDB();

  const product = await Product.findById(productId);
  if (!product || product.stockTrackingEnabled === false) {
    return false;
  }

  // Check if product is at or below minimum stock level
  if (product.currentQuantity <= product.minStockLevel) {
    // Check if we already have an unread low-stock notification for this product
    const existingNotifications = await notificationService.getNotifications(
      "system",
      {
        unreadOnly: true,
        category: "inventory",
      }
    );

    const hasExistingLowStockNotification = existingNotifications.some(
      (notification) =>
        notification.type === "low_stock" &&
        notification.data?.productId === productId
    );

    // Only create a new notification if one doesn't already exist
    if (!hasExistingLowStockNotification) {
      await notificationService.createNotification({
        type: "low_stock",
        title: `Low Stock Alert: ${product.name}`,
        message: `${product.name} is running low. Current stock: ${product.currentQuantity} ${product.metric}, Minimum level: ${product.minStockLevel} ${product.metric}`,
        data: {
          productId: product._id.toString(),
          productName: product.name,
          currentQuantity: product.currentQuantity,
          minStockLevel: product.minStockLevel,
          metric: product.metric,
        },
        userId: "system",
        priority: "high",
        category: "inventory",
      });
      return true;
    }
  }

  return false;
}

/**
 * Create a system notification
 */
export async function createSystemNotification(
  title: string,
  message: string
): Promise<void> {
  await notificationService.createNotification({
    type: "system",
    title,
    message,
    userId: "system",
    priority: "medium",
    category: "system",
  });
}

/**
 * Create an alert notification
 */
export async function createAlertNotification(
  title: string,
  message: string,
  productId?: string
): Promise<void> {
  await notificationService.createNotification({
    type: "system",
    title,
    message,
    data: productId ? { productId } : undefined,
    userId: "system",
    priority: "high",
    category: "alert",
  });
}
