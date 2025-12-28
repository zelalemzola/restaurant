// AuditLog Mongoose model for tracking all system activities
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IAuditLog {
  _id: string;
  userId: Types.ObjectId;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogDocument extends Omit<IAuditLog, "_id">, Document {}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "STOCK_USAGE",
        "STOCK_ADDITION",
        "STOCK_ADJUSTMENT",
        "SALES_TRANSACTION",
        "COST_OPERATION",
        "BACKUP_CREATED",
        "DATA_EXPORT",
        "PERMISSION_CHANGE",
      ],
    },
    resource: {
      type: String,
      required: true,
      enum: [
        "USER",
        "PRODUCT",
        "PRODUCT_GROUP",
        "STOCK_TRANSACTION",
        "SALES_TRANSACTION",
        "COST_OPERATION",
        "NOTIFICATION",
        "SYSTEM",
      ],
    },
    resourceId: {
      type: String,
      trim: true,
    },
    details: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    success: {
      type: Boolean,
      required: true,
      default: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: false, // We use our own timestamp field
  }
);

// Create indexes for efficient querying
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 }); // For general chronological queries
AuditLogSchema.index({ success: 1, timestamp: -1 }); // For error tracking

export const AuditLog =
  mongoose.models.AuditLog ||
  mongoose.model<AuditLogDocument>("AuditLog", AuditLogSchema);
