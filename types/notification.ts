// Notification type definitions
import { ObjectId } from "mongoose";

export interface Notification {
  _id: string;
  type:
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

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  userId?: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  expiresAt?: Date;
}
