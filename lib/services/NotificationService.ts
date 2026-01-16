import connectDB from "@/lib/mongodb";
import mongoose from "mongoose";
import { eventBroadcaster } from "./eventBroadcaster";

export type NotificationType =
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "cost_created"
  | "cost_updated"
  | "cost_deleted"
  | "inventory_updated"
  | "sale_created"
  | "low_stock"
  | "system"
  | "user_created"
  | "user_updated"
  | "user_deleted";

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  category: string;
  icon?: string;
}

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  userId?: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  expiresAt?: Date;
}

export interface NotificationDocument {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  userId: string;
  read: boolean;
  priority: "low" | "medium" | "high";
  category: string;
  createdAt: Date;
  expiresAt?: Date;
}

// Notification templates for different operation types
const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  product_created: {
    type: "product_created",
    title: "Product Created",
    message: "A new product has been added to the inventory",
    priority: "medium",
    category: "inventory",
    icon: "package-plus",
  },
  product_updated: {
    type: "product_updated",
    title: "Product Updated",
    message: "Product information has been modified",
    priority: "low",
    category: "inventory",
    icon: "package",
  },
  product_deleted: {
    type: "product_deleted",
    title: "Product Deleted",
    message: "A product has been removed from the inventory",
    priority: "medium",
    category: "inventory",
    icon: "package-x",
  },
  cost_created: {
    type: "cost_created",
    title: "Cost Entry Added",
    message: "A new cost operation has been recorded",
    priority: "medium",
    category: "finance",
    icon: "dollar-sign",
  },
  cost_updated: {
    type: "cost_updated",
    title: "Cost Entry Updated",
    message: "A cost operation has been modified",
    priority: "low",
    category: "finance",
    icon: "edit",
  },
  cost_deleted: {
    type: "cost_deleted",
    title: "Cost Entry Deleted",
    message: "A cost operation has been removed",
    priority: "medium",
    category: "finance",
    icon: "trash",
  },
  inventory_updated: {
    type: "inventory_updated",
    title: "Inventory Updated",
    message: "Stock levels have been modified",
    priority: "medium",
    category: "inventory",
    icon: "package",
  },
  sale_created: {
    type: "sale_created",
    title: "Sale Recorded",
    message: "A new sale transaction has been processed",
    priority: "low",
    category: "sales",
    icon: "shopping-cart",
  },
  low_stock: {
    type: "low_stock",
    title: "Low Stock Alert",
    message: "Items are running low and need restocking",
    priority: "high",
    category: "inventory",
    icon: "alert-triangle",
  },
  system: {
    type: "system",
    title: "System Notification",
    message: "System maintenance or update notification",
    priority: "medium",
    category: "system",
    icon: "settings",
  },
  user_created: {
    type: "user_created",
    title: "User Created",
    message: "A new user account has been created",
    priority: "low",
    category: "users",
    icon: "user-plus",
  },
  user_updated: {
    type: "user_updated",
    title: "User Updated",
    message: "User account information has been modified",
    priority: "low",
    category: "users",
    icon: "user",
  },
  user_deleted: {
    type: "user_deleted",
    title: "User Deleted",
    message: "A user account has been removed",
    priority: "medium",
    category: "users",
    icon: "user-x",
  },
};

class NotificationService {
  private subscribers: Map<
    string,
    Array<(notification: NotificationDocument) => void>
  > = new Map();

  // Create a notification
  async createNotification(
    notificationData: NotificationData
  ): Promise<NotificationDocument | null> {
    try {
      await connectDB();

      const template = NOTIFICATION_TEMPLATES[notificationData.type];

      const notification = {
        type: notificationData.type,
        title: notificationData.title || template.title,
        message: notificationData.message || template.message,
        data: notificationData.data || {},
        userId: notificationData.userId || "system",
        read: false,
        priority: notificationData.priority || template.priority,
        category: notificationData.category || template.category,
        createdAt: new Date(),
        expiresAt: notificationData.expiresAt,
      };

      // Insert into database
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db
        .collection("notifications")
        .insertOne(notification);

      const createdNotification: NotificationDocument = {
        ...notification,
        _id: result.insertedId.toString(),
      };

      // Broadcast real-time notification
      this.broadcastNotification(createdNotification);

      return createdNotification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  // Get notifications for a user
  async getNotifications(
    userId: string,
    options: {
      unreadOnly?: boolean;
      type?: string;
      category?: string;
      limit?: number;
      skip?: number;
    } = {}
  ): Promise<NotificationDocument[]> {
    try {
      await connectDB();

      const query: any = { userId };

      if (options.unreadOnly) {
        query.read = false;
      }

      if (options.type) {
        query.type = options.type;
      }

      if (options.category) {
        query.category = options.category;
      }

      // Add expiration filter
      query.$or = [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } },
      ];

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const notifications = await db
        .collection("notifications")
        .find(query)
        .sort({ createdAt: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 50)
        .toArray();

      return notifications.map((notification: any) => ({
        ...notification,
        _id: notification._id.toString(),
      })) as NotificationDocument[];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      await connectDB();

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db
        .collection("notifications")
        .updateOne(
          { _id: new mongoose.Types.ObjectId(notificationId) },
          { $set: { read: true } }
        );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
  }

  // Mark notification as unread
  async markAsUnread(notificationId: string): Promise<boolean> {
    try {
      await connectDB();

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db
        .collection("notifications")
        .updateOne(
          { _id: new mongoose.Types.ObjectId(notificationId) },
          { $set: { read: false } }
        );

      return result.modifiedCount > 0;
    } catch (error) {
      console.error("Error marking notification as unread:", error);
      return false;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<number> {
    try {
      await connectDB();

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db
        .collection("notifications")
        .updateMany({ userId, read: false }, { $set: { read: true } });

      return result.modifiedCount;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return 0;
    }
  }

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      await connectDB();

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db.collection("notifications").deleteOne({
        _id: new mongoose.Types.ObjectId(notificationId),
      });

      return result.deletedCount > 0;
    } catch (error) {
      console.error("Error deleting notification:", error);
      return false;
    }
  }

  // Delete expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      await connectDB();

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db.collection("notifications").deleteMany({
        expiresAt: { $lt: new Date() },
      });

      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error("Error cleaning up expired notifications:", error);
      return 0;
    }
  }

  // Get unread count for a user
  async getUnreadCount(userId: string): Promise<number> {
    try {
      await connectDB();

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const count = await db.collection("notifications").countDocuments({
        userId,
        read: false,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      });

      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Subscribe to real-time notifications
  subscribe(
    userId: string,
    callback: (notification: NotificationDocument) => void
  ): void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, []);
    }
    this.subscribers.get(userId)!.push(callback);
  }

  // Unsubscribe from real-time notifications
  unsubscribe(
    userId: string,
    callback: (notification: NotificationDocument) => void
  ): void {
    const userSubscribers = this.subscribers.get(userId);
    if (userSubscribers) {
      const index = userSubscribers.indexOf(callback);
      if (index > -1) {
        userSubscribers.splice(index, 1);
      }
    }
  }

  // Broadcast notification to subscribers
  private broadcastNotification(notification: NotificationDocument): void {
    // Broadcast to specific user
    const userSubscribers = this.subscribers.get(notification.userId);
    if (userSubscribers) {
      userSubscribers.forEach((callback) => {
        try {
          callback(notification);
        } catch (error) {
          console.error("Error in notification subscriber:", error);
        }
      });
    }

    // Broadcast to system subscribers (userId: 'system')
    const systemSubscribers = this.subscribers.get("system");
    if (systemSubscribers) {
      systemSubscribers.forEach((callback) => {
        try {
          callback(notification);
        } catch (error) {
          console.error("Error in system notification subscriber:", error);
        }
      });
    }

    // Also broadcast through event broadcaster for Redux integration
    eventBroadcaster.broadcastNotification(notification);
  }

  // Create notifications for CRUD operations
  async createProductNotification(
    operation: "created" | "updated" | "deleted",
    productData: any,
    userId?: string
  ): Promise<void> {
    const type: NotificationType = `product_${operation}` as NotificationType;
    const productName = productData.name || "Unknown Product";

    let message = "";
    switch (operation) {
      case "created":
        message = `Product "${productName}" has been added to the inventory`;
        break;
      case "updated":
        message = `Product "${productName}" information has been updated`;
        break;
      case "deleted":
        message = `Product "${productName}" has been removed from the inventory`;
        break;
    }

    await this.createNotification({
      type,
      title: NOTIFICATION_TEMPLATES[type].title,
      message,
      data: {
        productId: productData._id || productData.id,
        productName,
        operation,
        timestamp: new Date(),
      },
      userId: userId || "system",
      priority: NOTIFICATION_TEMPLATES[type].priority,
      category: NOTIFICATION_TEMPLATES[type].category,
    });
  }

  async createCostNotification(
    operation: "created" | "updated" | "deleted",
    costData: any,
    userId?: string
  ): Promise<void> {
    const type: NotificationType = `cost_${operation}` as NotificationType;
    const amount = costData.amount || 0;
    const description = costData.description || "Cost operation";

    let message = "";
    switch (operation) {
      case "created":
        message = `New cost entry: ${description} ($${amount.toFixed(2)})`;
        break;
      case "updated":
        message = `Cost entry updated: ${description} ($${amount.toFixed(2)})`;
        break;
      case "deleted":
        message = `Cost entry deleted: ${description}`;
        break;
    }

    await this.createNotification({
      type,
      title: NOTIFICATION_TEMPLATES[type].title,
      message,
      data: {
        costId: costData._id || costData.id,
        amount,
        description,
        category: costData.category,
        operation,
        timestamp: new Date(),
      },
      userId: userId || "system",
      priority: NOTIFICATION_TEMPLATES[type].priority,
      category: NOTIFICATION_TEMPLATES[type].category,
    });
  }

  async createInventoryNotification(
    productData: any,
    oldQuantity: number,
    newQuantity: number,
    operation: string,
    userId?: string
  ): Promise<void> {
    const productName = productData.name || "Unknown Product";
    const change = newQuantity - oldQuantity;
    const changeText = change > 0 ? `+${change}` : change.toString();

    const message = `${productName}: ${changeText} ${
      productData.metric || "units"
    } (${operation})`;

    await this.createNotification({
      type: "inventory_updated",
      title: "Inventory Updated",
      message,
      data: {
        productId: productData._id || productData.id,
        productName,
        oldQuantity,
        newQuantity,
        change,
        operation,
        timestamp: new Date(),
      },
      userId: userId || "system",
      priority: "medium",
      category: "inventory",
    });
  }

  // Create low stock notification
  async createLowStockNotification(
    productId: string,
    productName: string,
    currentStock: number,
    minStock: number,
    metric: string,
    urgencyLevel: "critical" | "warning" | "low" = "warning",
    userId?: string
  ): Promise<void> {
    let title = "Low Stock Alert";
    let message = `${productName} is running low`;
    let priority: "low" | "medium" | "high" = "medium";

    // Customize message and priority based on urgency
    switch (urgencyLevel) {
      case "critical":
        title =
          currentStock === 0 ? "Out of Stock Alert" : "Critical Stock Alert";
        message =
          currentStock === 0
            ? `${productName} is completely out of stock!`
            : `${productName} is critically low (${currentStock} ${metric} remaining)`;
        priority = "high";
        break;
      case "warning":
        title = "Low Stock Warning";
        message = `${productName} is below minimum threshold (${currentStock}/${minStock} ${metric})`;
        priority = "medium";
        break;
      case "low":
        title = "Stock Level Notice";
        message = `${productName} is approaching minimum stock level (${currentStock}/${minStock} ${metric})`;
        priority = "low";
        break;
    }

    await this.createNotification({
      type: "low_stock",
      title,
      message,
      data: {
        productId,
        productName,
        currentStock,
        minStock,
        metric,
        urgencyLevel,
        stockRatio: minStock > 0 ? currentStock / minStock : 0,
        timestamp: new Date(),
      },
      userId: userId || "system",
      priority,
      category: "inventory",
      // Set expiration for low stock notifications (7 days)
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  // Clean up resolved low stock notifications
  async cleanupResolvedLowStockNotifications(
    productId: string
  ): Promise<number> {
    try {
      await connectDB();

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const result = await db.collection("notifications").deleteMany({
        type: "low_stock",
        "data.productId": productId,
        read: false,
      });

      console.log(
        `Cleaned up ${result.deletedCount} resolved low stock notifications for product ${productId}`
      );
      return result.deletedCount;
    } catch (error) {
      console.error(
        "Error cleaning up resolved low stock notifications:",
        error
      );
      return 0;
    }
  }

  // Get active low stock notifications
  async getActiveLowStockNotifications(
    userId?: string
  ): Promise<NotificationDocument[]> {
    try {
      await connectDB();

      const query: any = {
        type: "low_stock",
        read: false,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      };

      if (userId && userId !== "system") {
        query.userId = userId;
      }

      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection not available");
      }

      const notifications = await db
        .collection("notifications")
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return notifications.map((notification: any) => ({
        ...notification,
        _id: notification._id.toString(),
      })) as NotificationDocument[];
    } catch (error) {
      console.error("Error fetching active low stock notifications:", error);
      return [];
    }
  }

  async createUserNotification(
    operation: "created" | "updated" | "deleted",
    userData: any,
    userId?: string
  ): Promise<void> {
    const type: NotificationType = `user_${operation}` as NotificationType;
    const userName = userData.name || userData.email || "Unknown User";

    let message = "";
    switch (operation) {
      case "created":
        message = `New user account created: ${userName}`;
        break;
      case "updated":
        message = `User account updated: ${userName}`;
        break;
      case "deleted":
        message = `User account deleted: ${userName}`;
        break;
    }

    await this.createNotification({
      type,
      title: NOTIFICATION_TEMPLATES[type].title,
      message,
      data: {
        userId: userData._id || userData.id,
        userName,
        userEmail: userData.email,
        operation,
        timestamp: new Date(),
      },
      userId: userId || "system",
      priority: NOTIFICATION_TEMPLATES[type].priority,
      category: NOTIFICATION_TEMPLATES[type].category,
    });
  }
}

// Create and export singleton instance
export const notificationService = new NotificationService();

// Initialize cleanup interval
let cleanupInterval: NodeJS.Timeout | null = null;

export function initializeNotificationService() {
  // Clean up expired notifications every hour
  cleanupInterval = setInterval(() => {
    notificationService.cleanupExpiredNotifications();
  }, 60 * 60 * 1000);

  console.log("Notification service initialized");
}

export function cleanupNotificationService() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  console.log("Notification service cleaned up");
}
