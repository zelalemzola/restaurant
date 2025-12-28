// Transaction validation schemas using Zod
import { z } from 'zod';

export const paymentMethodSchema = z.enum(['CBE', 'Abyssinia', 'Zemen', 'Awash', 'Telebirr', 'Cash', 'POS']);

export const stockTransactionTypeSchema = z.enum(['addition', 'usage', 'sale', 'adjustment']);

export const createStockTransactionSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  type: stockTransactionTypeSchema,
  quantity: z.number().positive('Quantity must be positive'),
  reason: z.string().trim().optional()
});

export const salesTransactionItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative')
});

export const createSalesTransactionSchema = z.object({
  items: z.array(salesTransactionItemSchema).min(1, 'At least one item is required'),
  paymentMethod: paymentMethodSchema
});