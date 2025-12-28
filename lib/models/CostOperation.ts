// CostOperation Mongoose model
import mongoose, { Schema, Document } from 'mongoose';
import { CostOperation } from '@/types';

export interface CostOperationDocument extends Omit<CostOperation, '_id'>, Document {}

const CostOperationSchema = new Schema<CostOperationDocument>({
  description: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['rent', 'salary', 'utilities', 'maintenance', 'other'],
    required: true
  },
  type: {
    type: String,
    enum: ['recurring', 'one-time'],
    required: true
  },
  recurringPeriod: {
    type: String,
    enum: ['monthly', 'weekly', 'yearly']
  },
  date: {
    type: Date,
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
CostOperationSchema.index({ category: 1 });
CostOperationSchema.index({ type: 1 });
CostOperationSchema.index({ date: -1 });
CostOperationSchema.index({ userId: 1 });
CostOperationSchema.index({ date: -1, category: 1 }); // Compound index for analytics
CostOperationSchema.index({ type: 1, recurringPeriod: 1 }); // For recurring cost queries

export default mongoose.models.CostOperation || mongoose.model<CostOperationDocument>('CostOperation', CostOperationSchema);