// Notification utility functions
import { Product, Notification } from "@/lib/models";
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

  // Find products that are at or below minimum stock level
  const lowStockProducts = await Product.find({
    $expr: { $lte: ["$currentQuantity", "$minStockLevel"] },
    type: { $in: ["stock", "combination"] }, // Only check stock and combination items
  }).populate("groupId", "name");

  const result: LowStockCheckResult = {
    lowStockProducts: [],
    notificationsCreated: 0,
  };

  for (const product of lowStockProducts) {
    // Check if we already have an unread low-stock notification for this product
    const existingNotification = await Notification.findOne({
      type: "low-stock",
      productId: product._id,
      isRead: false,
    });

    // Only create a new notification if one doesn't already exist
    if (!existingNotification) {
      const notification = new Notification({
        type: "low-stock",
        title: `Low Stock Alert: ${product.name}`,
        message: `${product.name} is running low. Current stock: ${product.currentQuantity} ${product.metric}, Minimum level: ${product.minStockLevel} ${product.metric}`,
        productId: product._id,
        isRead: false,
      });

      await notification.save();
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
  if (!product || !["stock", "combination"].includes(product.type)) {
    return false;
  }

  // Check if product is at or below minimum stock level
  if (product.currentQuantity <= product.minStockLevel) {
    // Check if we already have an unread low-stock notification for this product
    const existingNotification = await Notification.findOne({
      type: "low-stock",
      productId: product._id,
      isRead: false,
    });

    // Only create a new notification if one doesn't already exist
    if (!existingNotification) {
      const notification = new Notification({
        type: "low-stock",
        title: `Low Stock Alert: ${product.name}`,
        message: `${product.name} is running low. Current stock: ${product.currentQuantity} ${product.metric}, Minimum level: ${product.minStockLevel} ${product.metric}`,
        productId: product._id,
        isRead: false,
      });

      await notification.save();
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
  await connectDB();

  const notification = new Notification({
    type: "system",
    title,
    message,
    isRead: false,
  });

  await notification.save();
}

/**
 * Create an alert notification
 */
export async function createAlertNotification(
  title: string,
  message: string,
  productId?: string
): Promise<void> {
  await connectDB();

  const notification = new Notification({
    type: "alert",
    title,
    message,
    productId: productId || undefined,
    isRead: false,
  });

  await notification.save();
}
