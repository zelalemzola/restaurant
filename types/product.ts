// Product-related type definitions
import { ObjectId } from "mongoose";

export interface ProductGroup {
  _id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  _id: string;
  name: string;
  groupId: string | ObjectId;
  type: "stock" | "sellable" | "combination";
  metric: string; // kg, liters, pieces, custom
  currentQuantity: number;
  minStockLevel: number;
  costPrice?: number; // Required for stock and combination
  sellingPrice?: number; // Required for sellable and combination
  stockTrackingEnabled?: boolean; // Enable/disable stock tracking for this product
  createdAt: Date;
  updatedAt: Date;
}

export type ProductType = "stock" | "sellable" | "combination";

export interface CreateProductRequest {
  name: string;
  groupId: string;
  type: ProductType;
  metric: string;
  currentQuantity: number;
  minStockLevel: number;
  costPrice?: number;
  sellingPrice?: number;
  stockTrackingEnabled?: boolean;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  _id: string;
}
