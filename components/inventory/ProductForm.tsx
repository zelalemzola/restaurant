"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createProductSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import {
  useGetProductGroupsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
} from "@/lib/store/api";
import { MetricSelector } from "./MetricSelector";
import type { Product, ProductType } from "@/types";

type ProductFormData = z.infer<typeof createProductSchema>;

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [selectedType, setSelectedType] = useState<ProductType>("stock");
  const [error, setError] = useState<string>("");

  const { data: groupsResponse, isLoading: isLoadingGroups } =
    useGetProductGroupsQuery();
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

  const productGroups = groupsResponse?.success ? groupsResponse.data : [];
  const isEditing = !!product;
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      groupId: "",
      type: "stock",
      metric: "",
      currentQuantity: 0,
      minStockLevel: 0,
      costPrice: 0,
      sellingPrice: 0,
    },
  });

  const watchedType = watch("type");

  // Update selectedType when form type changes
  useEffect(() => {
    setSelectedType(watchedType);

    // Set default values based on product type
    if (watchedType === "sellable") {
      // For sellable items, set cost price to 0 by default
      setValue("costPrice", 0);
    } else if (watchedType === "stock") {
      // For stock items, set selling price to 0 by default
      setValue("sellingPrice", 0);
    }
    // For combination items, both prices are required so no defaults needed
  }, [watchedType, setValue]);

  // Populate form when editing
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        groupId:
          typeof product.groupId === "string"
            ? product.groupId
            : (product.groupId as any)._id,
        type: product.type,
        metric: product.metric,
        currentQuantity: product.currentQuantity,
        minStockLevel: product.minStockLevel,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
      });
      setSelectedType(product.type);
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    console.log("=== FORM SUBMISSION DEBUG ===");
    console.log("Raw form data:", data);
    console.log(
      "Cost price type:",
      typeof data.costPrice,
      "Value:",
      data.costPrice
    );
    console.log(
      "Selling price type:",
      typeof data.sellingPrice,
      "Value:",
      data.sellingPrice
    );

    // Include all data, but handle optional fields properly
    const cleanedData: any = {
      name: data.name,
      groupId: data.groupId,
      type: data.type,
      metric: data.metric,
      currentQuantity: data.currentQuantity,
      minStockLevel: data.minStockLevel,
    };

    // Always include cost price if provided (including 0)
    if (
      data.costPrice !== undefined &&
      data.costPrice !== null &&
      !isNaN(data.costPrice)
    ) {
      cleanedData.costPrice = data.costPrice;
      console.log("Including cost price:", data.costPrice);
    } else {
      console.log("Excluding cost price - undefined, null, or NaN");
    }

    // Always include selling price if provided (including 0)
    if (
      data.sellingPrice !== undefined &&
      data.sellingPrice !== null &&
      !isNaN(data.sellingPrice)
    ) {
      cleanedData.sellingPrice = data.sellingPrice;
      console.log("Including selling price:", data.sellingPrice);
    } else {
      console.log("Excluding selling price - undefined, null, or NaN");
    }

    console.log("Final cleaned data:", cleanedData);

    try {
      setError("");

      if (isEditing && product) {
        const result = await updateProduct({
          id: product._id,
          data: cleanedData,
        }).unwrap();

        console.log("Update result:", result);
        if (result.success) {
          onSuccess();
        } else {
          setError(result.error.message);
        }
      } else {
        const result = await createProduct(cleanedData).unwrap();

        console.log("Create result:", result);
        if (result.success) {
          onSuccess();
        } else {
          setError(result.error.message);
        }
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      setError(err?.data?.error?.message || "An error occurred");
    }
  };

  const requiresCostPrice =
    selectedType === "stock" || selectedType === "combination";
  const requiresSellingPrice =
    selectedType === "sellable" || selectedType === "combination";

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
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="groupId">Product Group *</Label>
              <Select
                value={watch("groupId")}
                onValueChange={(value) => setValue("groupId", value)}
                disabled={isLoadingGroups}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product group" />
                </SelectTrigger>
                <SelectContent>
                  {productGroups.map((group) => (
                    <SelectItem key={group._id} value={group._id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.groupId && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.groupId.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Product Type *</Label>
              <Select
                value={watch("type")}
                onValueChange={(value: ProductType) => {
                  setValue("type", value);
                  setSelectedType(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stock">Stock Item</SelectItem>
                  <SelectItem value="sellable">Sellable Item</SelectItem>
                  <SelectItem value="combination">Combination Item</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.type.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {selectedType === "stock" &&
                  "Raw materials or ingredients used in production"}
                {selectedType === "sellable" &&
                  "Finished products sold to customers"}
                {selectedType === "combination" &&
                  "Items that can be both used and sold"}
              </p>
            </div>

            <div>
              <MetricSelector
                value={watch("metric")}
                onChange={(value) => setValue("metric", value)}
                error={errors.metric?.message}
                placeholder="Select or enter unit of measurement"
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentQuantity">Current Quantity *</Label>
              <Input
                id="currentQuantity"
                type="number"
                step="0.01"
                min="0"
                {...register("currentQuantity", {
                  setValueAs: (value) => {
                    if (value === "" || value === null || value === undefined) {
                      return 0;
                    }
                    const num = parseFloat(value);
                    return isNaN(num) ? 0 : num;
                  },
                })}
                placeholder="0"
              />
              {errors.currentQuantity && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.currentQuantity.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="minStockLevel">Minimum Stock Level *</Label>
              <Input
                id="minStockLevel"
                type="number"
                step="0.01"
                min="0"
                {...register("minStockLevel", {
                  setValueAs: (value) => {
                    if (value === "" || value === null || value === undefined) {
                      return 0;
                    }
                    const num = parseFloat(value);
                    return isNaN(num) ? 0 : num;
                  },
                })}
                placeholder="0"
              />
              {errors.minStockLevel && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.minStockLevel.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Alert threshold for low stock notifications
              </p>
            </div>

            <div>
              <Label htmlFor="costPrice">
                Cost Price {requiresCostPrice ? "*" : "(Optional)"}{" "}
                {watch("metric") && `(per ${watch("metric")})`}
              </Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                {...register("costPrice", {
                  setValueAs: (value) => {
                    // Handle empty string or invalid input
                    if (value === "" || value === null || value === undefined) {
                      return undefined;
                    }
                    const num = parseFloat(value);
                    return isNaN(num) ? undefined : num;
                  },
                  required: requiresCostPrice
                    ? "Cost price is required"
                    : false,
                })}
                placeholder="0.00"
              />
              {errors.costPrice && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.costPrice.message}
                </p>
              )}
              {!requiresCostPrice && (
                <p className="text-xs text-muted-foreground mt-1">
                  Optional for sellable items
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="sellingPrice">
                Selling Price {requiresSellingPrice ? "*" : "(Optional)"}{" "}
                {watch("metric") && `(per ${watch("metric")})`}
              </Label>
              <Input
                id="sellingPrice"
                type="number"
                step="0.01"
                min="0"
                {...register("sellingPrice", {
                  setValueAs: (value) => {
                    // Handle empty string or invalid input
                    if (value === "" || value === null || value === undefined) {
                      return undefined;
                    }
                    const num = parseFloat(value);
                    return isNaN(num) ? undefined : num;
                  },
                  required: requiresSellingPrice
                    ? "Selling price is required"
                    : false,
                })}
                placeholder="0.00"
              />
              {errors.sellingPrice && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.sellingPrice.message}
                </p>
              )}
              {!requiresSellingPrice && (
                <p className="text-xs text-muted-foreground mt-1">
                  Optional for stock items
                </p>
              )}
            </div>

            {watch("costPrice") && watch("sellingPrice") && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Profit Margin</p>
                <p className="text-xs text-muted-foreground">
                  {(watch("costPrice") || 0) > 0
                    ? `${(
                        (((watch("sellingPrice") || 0) -
                          (watch("costPrice") || 0)) /
                          (watch("costPrice") || 1)) *
                        100
                      ).toFixed(1)}%`
                    : "Enter both prices to calculate"}
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
          {isEditing ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
