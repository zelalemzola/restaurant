"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useGetProductQuery, useAdjustStockMutation } from "@/lib/store/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Package, TrendingUp, TrendingDown } from "lucide-react";

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onSuccess?: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [newQuantity, setNewQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const { data: productData, isLoading: isLoadingProduct } = useGetProductQuery(
    productId || "",
    {
      skip: !productId,
    }
  );

  const [adjustStock, { isLoading: isAdjusting }] = useAdjustStockMutation();

  const product = productData?.success ? productData.data : null;

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (open && product) {
      setNewQuantity(product.currentQuantity.toString());
      setReason("");
      setErrors({});
    } else if (!open) {
      // Only reset when dialog closes to prevent unnecessary updates
      setNewQuantity("");
      setReason("");
      setErrors({});
    }
  }, [open, product?.currentQuantity, product?.name]); // More specific dependencies

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!newQuantity.trim()) {
      newErrors.newQuantity = "New quantity is required";
    } else {
      const qty = parseFloat(newQuantity);
      if (isNaN(qty) || qty < 0) {
        newErrors.newQuantity = "Quantity must be a non-negative number";
      }
    }

    if (!reason.trim()) {
      newErrors.reason = "Reason for adjustment is required";
    } else if (reason.trim().length < 3) {
      newErrors.reason = "Reason must be at least 3 characters long";
    } else if (reason.trim().length > 500) {
      newErrors.reason = "Reason must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [newQuantity, reason]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !productId) return;

    if (!validateForm()) return;

    try {
      const result = await adjustStock({
        productId,
        newQuantity: parseFloat(newQuantity),
        reason: reason.trim(),
      }).unwrap();

      if (result.success) {
        toast({
          title: "Stock Adjusted",
          description: `Successfully updated stock for ${product.name}`,
        });
        onSuccess?.();
      } else {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast({
        title: "Error",
        description: "Failed to adjust stock. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Memoize calculated values to prevent unnecessary re-renders
  const calculatedValues = useMemo(() => {
    if (!product) return null;

    const currentQuantity = product.currentQuantity || 0;
    const newQty = parseFloat(newQuantity) || 0;
    const difference = newQty - currentQuantity;
    const isIncrease = difference > 0;
    const isDecrease = difference < 0;

    return {
      currentQuantity,
      newQty,
      difference,
      isIncrease,
      isDecrease,
    };
  }, [product?.currentQuantity, newQuantity]);

  if (!product && !isLoadingProduct) {
    return null;
  }

  const values = calculatedValues || {
    currentQuantity: 0,
    newQty: 0,
    difference: 0,
    isIncrease: false,
    isDecrease: false,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adjust Stock Level
          </DialogTitle>
          <DialogDescription>
            Make manual adjustments to inventory quantities
          </DialogDescription>
        </DialogHeader>

        {isLoadingProduct ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">
              Loading product details...
            </div>
          </div>
        ) : product ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Info */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">{product.name}</h3>
                <Badge variant="secondary" className="capitalize">
                  {product.type}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Current Stock:{" "}
                <span className="font-medium">
                  {values.currentQuantity} {product.metric}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Min Level:{" "}
                <span className="font-medium">
                  {product.minStockLevel} {product.metric}
                </span>
              </div>
            </div>

            {/* New Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="newQuantity">New Quantity</Label>
              <div className="relative">
                <Input
                  id="newQuantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder={`Enter quantity in ${product.metric}`}
                  className={errors.newQuantity ? "border-red-500" : ""}
                />
                <div className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                  {product.metric}
                </div>
              </div>
              {errors.newQuantity && (
                <p className="text-sm text-red-500">{errors.newQuantity}</p>
              )}
            </div>

            {/* Adjustment Preview */}
            {newQuantity &&
              !isNaN(parseFloat(newQuantity)) &&
              values.difference !== 0 && (
                <Alert
                  className={
                    values.isIncrease
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }
                >
                  <div className="flex items-center gap-2">
                    {values.isIncrease ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <AlertDescription
                      className={
                        values.isIncrease ? "text-green-800" : "text-red-800"
                      }
                    >
                      {values.isIncrease ? "Increase" : "Decrease"} of{" "}
                      <span className="font-semibold">
                        {Math.abs(values.difference)} {product.metric}
                      </span>
                    </AlertDescription>
                  </div>
                </Alert>
              )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Adjustment</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why this adjustment is being made..."
                rows={3}
                className={errors.reason ? "border-red-500" : ""}
              />
              {errors.reason && (
                <p className="text-sm text-red-500">{errors.reason}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {reason.length}/500 characters
              </p>
            </div>

            {/* Low Stock Warning */}
            {values.newQty <= product.minStockLevel && values.newQty > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This adjustment will result in low stock levels.
                </AlertDescription>
              </Alert>
            )}

            {/* Out of Stock Warning */}
            {values.newQty === 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This adjustment will result in zero stock.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isAdjusting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isAdjusting || values.difference === 0}
              >
                {isAdjusting ? "Adjusting..." : "Adjust Stock"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Product not found or failed to load.
            </AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
