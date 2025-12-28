// Cost operation type definitions
import { ObjectId } from 'mongoose';

export interface CostOperation {
  _id: string;
  description: string;
  amount: number;
  category: CostCategory;
  type: "recurring" | "one-time";
  recurringPeriod?: "monthly" | "weekly" | "yearly";
  date: Date;
  userId: string | ObjectId;
  createdAt: Date;
}

export type CostCategory = "rent" | "salary" | "utilities" | "maintenance" | "other";

export interface CreateCostOperationRequest {
  description: string;
  amount: number;
  category: CostCategory;
  type: "recurring" | "one-time";
  recurringPeriod?: "monthly" | "weekly" | "yearly";
  date: Date;
}