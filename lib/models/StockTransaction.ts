// StockTransaction Mongoose model
import mongoose, { Schema, Document } from 'mongoose';
import { StockTransaction } from '@/types';

export interface StockTransactionDocument extends Omit<StockTransaction, '_id'>, Document {}

const StockTransactionSchema = new Schema<StockTransactionDocument>({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ['addition', 'usage', 'sale', 'adjustment'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  newQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    trim: true
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
StockTransactionSchema.index({ productId: 1 });
StockTransactionSchema.index({ type: 1 });
StockTransactionSchema.index({ createdAt: -1 });
StockTransactionSchema.index({ userId: 1 });
StockTransactionSchema.index({ productId: 1, createdAt: -1 }); // Compound index for product history

export default mongoose.models.StockTransaction || mongoose.model<StockTransactionDocument>('StockTransaction', StockTransactionSchema);