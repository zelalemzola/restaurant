// Cost operation validation schemas using Zod
import { z } from "zod";

export const costCategorySchema = z.enum([
  "rent",
  "salary",
  "utilities",
  "maintenance",
  "other",
]);

export const costTypeSchema = z.enum(["recurring", "one-time"]);

export const recurringPeriodSchema = z.enum(["monthly", "weekly", "yearly"]);

export const createCostOperationSchema = z
  .object({
    description: z.string().min(1, "Description is required").trim(),
    amount: z.number().positive("Amount must be positive"),
    category: costCategorySchema,
    type: costTypeSchema,
    recurringPeriod: recurringPeriodSchema.optional(),
    date: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  })
  .refine(
    (data) => {
      // Recurring period is required for recurring costs
      if (data.type === "recurring" && !data.recurringPeriod) {
        return false;
      }
      return true;
    },
    {
      message: "Recurring period is required for recurring costs",
      path: ["recurringPeriod"],
    }
  );
