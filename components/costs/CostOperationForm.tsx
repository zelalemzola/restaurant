"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createCostOperationSchema,
  costCategorySchema,
} from "@/lib/validations";

// Create a form-specific schema that expects Date objects
const costOperationFormSchema = z
  .object({
    description: z.string().min(1, "Description is required").trim(),
    amount: z.number().positive("Amount must be positive"),
    category: costCategorySchema,
    type: z.enum(["recurring", "one-time"]),
    recurringPeriod: z.enum(["monthly", "weekly", "yearly"]).optional(),
    date: z.date(),
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, DollarSign, Calendar, Tag, Repeat } from "lucide-react";
import {
  useCreateCostOperationMutation,
  useUpdateCostOperationMutation,
} from "@/lib/store/api";
import type { CostOperation, CostCategory } from "@/types/cost";

type CostOperationFormData = {
  description: string;
  amount: number;
  category: CostCategory;
  type: "recurring" | "one-time";
  recurringPeriod?: "monthly" | "weekly" | "yearly";
  date: Date;
};

interface CostOperationFormProps {
  costOperation?: CostOperation;
  onSuccess: () => void;
  onCancel: () => void;
}

const costCategories: {
  value: CostCategory;
  label: string;
  description: string;
}[] = [
  {
    value: "rent",
    label: "Rent",
    description: "Property rental and lease payments",
  },
  {
    value: "salary",
    label: "Salary",
    description: "Employee wages and benefits",
  },
  {
    value: "utilities",
    label: "Utilities",
    description: "Electricity, water, gas, internet",
  },
  {
    value: "maintenance",
    label: "Maintenance",
    description: "Equipment and facility maintenance",
  },
  {
    value: "other",
    label: "Other",
    description: "Miscellaneous business expenses",
  },
];

const recurringPeriods = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly" },
];

export function CostOperationForm({
  costOperation,
  onSuccess,
  onCancel,
}: CostOperationFormProps) {
  const [error, setError] = useState<string>("");

  const [createCostOperation, { isLoading: isCreating }] =
    useCreateCostOperationMutation();
  const [updateCostOperation, { isLoading: isUpdating }] =
    useUpdateCostOperationMutation();

  const isEditing = !!costOperation;
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CostOperationFormData>({
    resolver: zodResolver(costOperationFormSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "other",
      type: "one-time",
      recurringPeriod: undefined,
      date: new Date(),
    },
  });

  const watchedType = watch("type");
  const watchedCategory = watch("category");

  // Populate form when editing
  useEffect(() => {
    if (costOperation) {
      reset({
        description: costOperation.description,
        amount: costOperation.amount,
        category: costOperation.category,
        type: costOperation.type,
        recurringPeriod: costOperation.recurringPeriod,
        date: new Date(costOperation.date),
      });
    }
  }, [costOperation, reset]);

  const onSubmit = async (data: CostOperationFormData) => {
    try {
      setError("");

      if (isEditing && costOperation) {
        const result = await updateCostOperation({
          id: costOperation._id,
          data,
        }).unwrap();

        if (result.success) {
          onSuccess();
        } else {
          setError(result.error.message);
        }
      } else {
        const result = await createCostOperation(data).unwrap();

        if (result.success) {
          onSuccess();
        } else {
          setError(result.error.message);
        }
      }
    } catch (err: any) {
      setError(err?.data?.error?.message || "An error occurred");
    }
  };

  const selectedCategory = costCategories.find(
    (cat) => cat.value === watchedCategory
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Cost Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter cost description (e.g., Monthly office rent, Staff salary for John)"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="amount" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register("amount", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={watch("category")}
                onValueChange={(value: CostCategory) =>
                  setValue("category", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cost category" />
                </SelectTrigger>
                <SelectContent>
                  {costCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div>
                        <div className="font-medium">{category.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {category.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.category.message}
                </p>
              )}
              {selectedCategory && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedCategory.description}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                {...register("date", {
                  setValueAs: (value) => (value ? new Date(value) : new Date()),
                })}
                defaultValue={new Date().toISOString().split("T")[0]}
              />
              {errors.date && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.date.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recurring Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Recurring Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="type">Cost Type *</Label>
              <Select
                value={watch("type")}
                onValueChange={(value: "recurring" | "one-time") => {
                  setValue("type", value);
                  if (value === "one-time") {
                    setValue("recurringPeriod", undefined);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cost type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-time">
                    <div>
                      <div className="font-medium">One-time</div>
                      <div className="text-xs text-muted-foreground">
                        Single occurrence expense
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="recurring">
                    <div>
                      <div className="font-medium">Recurring</div>
                      <div className="text-xs text-muted-foreground">
                        Regular repeating expense
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.type.message}
                </p>
              )}
            </div>

            {watchedType === "recurring" && (
              <div>
                <Label htmlFor="recurringPeriod">Recurring Period *</Label>
                <Select
                  value={watch("recurringPeriod") || ""}
                  onValueChange={(value: "monthly" | "weekly" | "yearly") =>
                    setValue("recurringPeriod", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recurring period" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurringPeriods.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.recurringPeriod && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.recurringPeriod.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  How often this cost occurs
                </p>
              </div>
            )}

            {watchedType === "recurring" &&
              watch("recurringPeriod") &&
              watch("amount") > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Cost Summary</p>
                  <p className="text-xs text-muted-foreground">
                    ${watch("amount").toFixed(2)} {watch("recurringPeriod")}
                    {watch("recurringPeriod") === "monthly" &&
                      ` (${(watch("amount") * 12).toFixed(2)} annually)`}
                    {watch("recurringPeriod") === "weekly" &&
                      ` (${(watch("amount") * 52).toFixed(2)} annually)`}
                  </p>
                </div>
              )}

            {watchedType === "one-time" && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">One-time Expense</p>
                <p className="text-xs text-muted-foreground">
                  This cost will not repeat automatically
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Update Cost" : "Add Cost"}
        </Button>
      </div>
    </form>
  );
}
