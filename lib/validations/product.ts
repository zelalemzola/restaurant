// Product validation schemas using Zod
import { z } from "zod";

export const productTypeSchema = z.enum(["stock", "sellable", "combination"]);

// Common metric options for restaurants
export const commonMetrics = [
  "kg",
  "g",
  "lbs",
  "oz", // Weight
  "liters",
  "ml",
  "gallons",
  "cups", // Volume
  "pieces",
  "units",
  "items", // Count
  "boxes",
  "bags",
  "bottles", // Packaging
  "meters",
  "cm",
  "inches", // Length
  "servings",
  "portions", // Food service
] as const;

export const metricSchema = z
  .string()
  .min(1, "Metric is required")
  .max(20, "Metric must be 20 characters or less")
  .regex(
    /^[a-zA-Z0-9\s\-_\/]+$/,
    "Metric can only contain letters, numbers, spaces, hyphens, underscores, and forward slashes"
  )
  .trim();

export const createProductSchema = z
  .object({
    name: z
      .string()
      .min(1, "Product name is required")
      .max(100, "Product name must be 100 characters or less")
      .trim(),
    groupId: z.string().min(1, "Product group is required"),
    type: productTypeSchema,
    metric: metricSchema,
    currentQuantity: z
      .number()
      .min(0, "Current quantity must be non-negative")
      .max(999999, "Current quantity is too large"),
    minStockLevel: z
      .number()
      .min(0, "Minimum stock level must be non-negative")
      .max(999999, "Minimum stock level is too large"),
    costPrice: z
      .number()
      .min(0, "Cost price must be non-negative")
      .max(999999, "Cost price is too large")
      .optional(),
    sellingPrice: z
      .number()
      .min(0, "Selling price must be non-negative")
      .max(999999, "Selling price is too large")
      .optional(),
  })
  .refine(
    (data) => {
      // Cost price is required for stock and combination items
      if (
        (data.type === "stock" || data.type === "combination") &&
        data.costPrice == null
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Cost price is required for stock and combination items",
      path: ["costPrice"],
    }
  )
  .refine(
    (data) => {
      // Selling price is required for sellable and combination items
      if (
        (data.type === "sellable" || data.type === "combination") &&
        data.sellingPrice == null
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Selling price is required for sellable and combination items",
      path: ["sellingPrice"],
    }
  )
  .refine(
    (data) => {
      // Validate that selling price is higher than cost price when both are present
      if (
        data.costPrice != null &&
        data.sellingPrice != null &&
        data.sellingPrice <= data.costPrice
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Selling price must be higher than cost price",
      path: ["sellingPrice"],
    }
  );

export const updateProductSchema = createProductSchema.partial().extend({
  _id: z.string().min(1, "Product ID is required"),
});

export const productGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").trim(),
  description: z.string().trim().optional(),
});
