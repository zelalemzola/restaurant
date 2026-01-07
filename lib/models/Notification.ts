// Notification Mongoose model
import mongoose, { Schema, Document } from "mongoose";
import { Notification } from "@/types";

export interface NotificationDocument
  extends Omit<Notification, "_id">,
    Document {}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    type: {
      type: String,
      enum: [
        "product_created",
        "product_updated",
        "product_deleted",
        "cost_created",
        "cost_updated",
        "cost_deleted",
        "inventory_updated",
        "sale_created",
        "low_stock",
        "system",
        "user_created",
        "user_updated",
        "user_deleted",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
    userId: {
      type: String,
      required: true,
      default: "system",
    },
    read: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ category: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ expiresAt: 1 });

export default mongoose.models.Notification ||
  mongoose.model<NotificationDocument>("Notification", NotificationSchema);
