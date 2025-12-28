// Transaction-related type definitions
import { ObjectId } from 'mongoose';

export interface StockTransaction {
  _id: string;
  productId: string | ObjectId;
  type: "addition" | "usage" | "sale" | "adjustment";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  userId: string | ObjectId;
  createdAt: Date;
}

export interface SalesTransactionItem {
  productId: string | ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SalesTransaction {
  _id: string;
  items: SalesTransactionItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  userId: string | ObjectId;
  createdAt: Date;
}

export type PaymentMethod =
  | "CBE"
  | "Abyssinia"
  | "Zemen"
  | "Awash"
  | "Telebirr"
  | "Cash"
  | "POS";

export interface CreateSalesTransactionRequest {
  items: Omit<SalesTransactionItem, 'totalPrice'>[];
  paymentMethod: PaymentMethod;
}

export interface CreateStockTransactionRequest {
  productId: string;
  type: "addition" | "usage" | "adjustment";
  quantity: number;
  reason?: string;
}