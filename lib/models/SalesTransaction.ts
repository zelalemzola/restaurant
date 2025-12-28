// SalesTransaction Mongoose model
import mongoose, { Schema, Document } from 'mongoose';
import { SalesTransaction, SalesTransactionItem } from '@/types';

export interface SalesTransactionDocument extends Omit<SalesTransaction, '_id'>, Document {}

const SalesTransactionItemSchema = new Schema<SalesTransactionItem>({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const SalesTransactionSchema = new Schema<SalesTransactionDocument>({
  items: {
    type: [SalesTransactionItemSchema],
    required: true,
    validate: {
      validator: function(items: SalesTransactionItem[]) {
        return items.length > 0;
      },
      message: 'At least one item is required'
    }
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['CBE', 'Abyssinia', 'Zemen', 'Awash', 'Telebirr', 'Cash', 'POS'],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Will be updated when user system is implemented
    required: true
  }
}, {
  timestamps: true
});

// Create indexes
SalesTransactionSchema.index({ createdAt: -1 });
SalesTransactionSchema.index({ paymentMethod: 1 });
SalesTransactionSchema.index({ userId: 1 });
SalesTransactionSchema.index({ 'items.productId': 1 });
SalesTransactionSchema.index({ createdAt: -1, paymentMethod: 1 }); // Compound index for analytics

export default mongoose.models.SalesTransaction || mongoose.model<SalesTransactionDocument>('SalesTransaction', SalesTransactionSchema);