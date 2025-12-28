// Product Mongoose model
import mongoose, { Schema, Document } from 'mongoose';
import { Product } from '@/types';

export interface ProductDocument extends Omit<Product, '_id'>, Document {}

const ProductSchema = new Schema<ProductDocument>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductGroup',
    required: true
  },
  type: {
    type: String,
    enum: ['stock', 'sellable', 'combination'],
    required: true
  },
  metric: {
    type: String,
    required: true,
    trim: true
  },
  currentQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  minStockLevel: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  sellingPrice: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Create indexes
ProductSchema.index({ groupId: 1 });
ProductSchema.index({ type: 1 });
ProductSchema.index({ currentQuantity: 1 });
ProductSchema.index({ name: 1 });
ProductSchema.index({ minStockLevel: 1 });

export default mongoose.models.Product || mongoose.model<ProductDocument>('Product', ProductSchema);