// Notification Mongoose model
import mongoose, { Schema, Document } from 'mongoose';
import { Notification } from '@/types';

export interface NotificationDocument extends Omit<Notification, '_id'>, Document {}

const NotificationSchema = new Schema<NotificationDocument>({
  type: {
    type: String,
    enum: ['low-stock', 'system', 'alert'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Create indexes
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ productId: 1 });

export default mongoose.models.Notification || mongoose.model<NotificationDocument>('Notification', NotificationSchema);