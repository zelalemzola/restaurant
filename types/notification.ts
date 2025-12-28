// Notification type definitions
import { ObjectId } from 'mongoose';

export interface Notification {
  _id: string;
  type: "low-stock" | "system" | "alert";
  title: string;
  message: string;
  productId?: string | ObjectId; // For low-stock notifications
  isRead: boolean;
  createdAt: Date;
}

export type NotificationType = "low-stock" | "system" | "alert";

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  productId?: string;
}