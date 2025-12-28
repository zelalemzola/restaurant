// Validation schemas using Zod
import { z } from "zod";

// Product validation schema with conditional requirements
export const createProductSchema = z
  .object({
    name: z
      .string()
      .min(1, "Product name is required")
      .max(100, "Product name too long"),
    groupId: z.string().min(1, "Product group is required"),
    type: z.enum(["stock", "sellable", "combination"], {
      errorMap: () => ({
        message: "Product type must be stock, sellable, or combination",
      }),
    }),
    metric: z.string().min(1, "Metric is required").max(20, "Metric too long"),
    currentQuantity: z
      .number()
      .min(0, "Current quantity cannot be negative")
      .default(0),
    minStockLevel: z
      .number()
      .min(0, "Minimum stock level cannot be negative")
      .default(0),
    costPrice: z.number().min(0, "Cost price cannot be negative").optional(),
    sellingPrice: z
      .number()
      .min(0, "Selling price cannot be negative")
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Cost price is required for stock and combination items (only if not NaN)
    if (data.type === "stock" || data.type === "combination") {
      if (
        data.costPrice === undefined ||
        data.costPrice === null ||
        isNaN(data.costPrice)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cost price is required for stock and combination items",
          path: ["costPrice"],
        });
      }
    }

    // Selling price is required for sellable and combination items (only if not NaN)
    if (data.type === "sellable" || data.type === "combination") {
      if (
        data.sellingPrice === undefined ||
        data.sellingPrice === null ||
        isNaN(data.sellingPrice)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Selling price is required for sellable and combination items",
          path: ["sellingPrice"],
        });
      }
    }
  });

export type CreateProductRequest = z.infer<typeof createProductSchema>;

// Product group validation schema
export const productGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(50, "Group name too long"),
  description: z.string().max(200, "Description too long").optional(),
});

export type CreateProductGroupRequest = z.infer<typeof productGroupSchema>;

// Sales transaction validation schema
export const createSalesTransactionSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().min(0.01, "Quantity must be greater than 0"),
        unitPrice: z
          .number()
          .min(0, "Unit price cannot be negative")
          .optional(),
      })
    )
    .min(1, "At least one item is required"),
  paymentMethod: z.enum(
    ["CBE", "Abyssinia", "Zemen", "Awash", "Telebirr", "Cash", "POS"],
    {
      errorMap: () => ({ message: "Invalid payment method" }),
    }
  ),
});

export type CreateSalesTransactionRequest = z.infer<
  typeof createSalesTransactionSchema
>;

// Stock transaction validation schema
export const createStockTransactionSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  type: z.enum(["addition", "usage", "sale", "adjustment"], {
    errorMap: () => ({ message: "Invalid transaction type" }),
  }),
  quantity: z.number().refine((val) => val !== 0, "Quantity cannot be zero"),
  reason: z.string().max(200, "Reason too long").optional(),
});

export type CreateStockTransactionRequest = z.infer<
  typeof createStockTransactionSchema
>;

// Cost operation validation schema
export const createCostOperationSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description too long"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.enum(["rent", "salary", "utilities", "maintenance", "other"], {
    errorMap: () => ({ message: "Invalid category" }),
  }),
  type: z.enum(["recurring", "one-time"], {
    errorMap: () => ({ message: "Type must be recurring or one-time" }),
  }),
  recurringPeriod: z.enum(["monthly", "weekly", "yearly"]).optional(),
  date: z
    .string()
    .or(z.date())
    .transform((val) => new Date(val)),
});

export type CreateCostOperationRequest = z.infer<
  typeof createCostOperationSchema
>;

// Cost category schema for form validation
export const costCategorySchema = z.enum([
  "rent",
  "salary",
  "utilities",
  "maintenance",
  "other",
]);

export type CostCategory = z.infer<typeof costCategorySchema>;

// User validation schema
export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  firstName: z.string().max(50, "First name too long").optional(),
  lastName: z.string().max(50, "Last name too long").optional(),
  role: z.enum(["admin", "manager", "user"], {
    errorMap: () => ({ message: "Role must be admin, manager, or user" }),
  }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CreateUserRequest = z.infer<typeof createUserSchema>;

// Stock adjustment validation schema
export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  newQuantity: z.number().min(0, "New quantity cannot be negative"),
  reason: z.string().min(1, "Reason is required").max(200, "Reason too long"),
});

export type StockAdjustmentRequest = z.infer<typeof stockAdjustmentSchema>;

// Stock usage validation schema
export const stockUsageSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  reason: z.string().max(200, "Reason too long").optional(),
});

export type StockUsageRequest = z.infer<typeof stockUsageSchema>;
