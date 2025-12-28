// ProductGroup Mongoose model
import mongoose, { Schema, Document } from 'mongoose';
import { ProductGroup } from '@/types';

export interface ProductGroupDocument extends Omit<ProductGroup, '_id'>, Document {}

const ProductGroupSchema = new Schema<ProductGroupDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create indexes
ProductGroupSchema.index({ name: 1 });

export default mongoose.models.ProductGroup || mongoose.model<ProductGroupDocument>('ProductGroup', ProductGroupSchema);