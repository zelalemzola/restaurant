'use client';

import { useState, useEffect } from 'react';
import { useGetProductQuery, useRecordStockUsageMutation } from '@/lib/store/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Package, Minus, TrendingDown } from 'lucide-react';

interface StockUsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  onSuccess?: () => void;
}

export function StockUsageDialog({
  open,
  onOpenChange,
  productId,
  onSuccess,
}: StockUsageDialogProps) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const {
    data: productData,
    isLoading: isLoadingProduct,
  } = useGetProductQuery(productId || '', {
    skip: !productId,
  });

  const [recordUsage, { isLoading: isRecording }] = useRecordStockUsageMutation();

  const product = productData?.success ? productData.data : null;

  // Reset form when dialog opens/closes or product changes
  useEffect(() => {
    if (open && product) {
      setQuantity('');
      setReason('');
      setErrors({});
    } else if (!open) {
      setQuantity('');
      setReason('');
      setErrors({});
    }
  }, [open, product]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else {
      const qty = parseFloat(quantity);
      if (isNaN(qty) || qty <= 0) {
        newErrors.quantity = 'Quantity must be a positive number';
      } else if (product && qty > product.currentQuantity) {
        newErrors.quantity = `Insufficient stock. Available: ${product.currentQuantity} ${product.metric}`;
      }
    }

    if (reason.trim().length > 500) {
      newErrors.reason = 'Reason must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !productId) return;

    if (!validateForm()) return;

    try {
      const result = await recordUsage({
        productId,
        quantity: parseFloat(quantity),
        reason: reason.trim() || undefined,
      }).unwrap();

      if (result.success) {
        toast({
          title: 'Usage Recorded',
          description: `Successfully recorded usage of ${quantity} ${product.metric} for ${product.name}`,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error recording usage:', error);
      
      // Handle specific error cases
      if (error?.data?.error?.code === 'INSUFFICIENT_STOCK') {
        setErrors({
          quantity: error.data.error.message,
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to record usage. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!product && !isLoadingProduct) {
    return null;
  }

  const currentQuantity = product?.currentQuantity || 0;
  const usageQty = parseFloat(quantity) || 0;
  const remainingQuantity = currentQuantity - usageQty;
  const willBeLowStock = product && remainingQuantity <= product.minStockLevel;
  const willBeOutOfStock = remainingQuantity <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Minus className="h-5 w-5" />
            Record Stock Usage
          </DialogTitle>
          <DialogDescription>
            Record materials used from inventory
          </DialogDescription>
        </DialogHeader>

        {isLoadingProduct ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading product details...</div>
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
                Available Stock: <span className="font-medium">{currentQuantity} {product.metric}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Min Level: <span className="font-medium">{product.minStockLevel} {product.metric}</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Usage Quantity</Label>
              <div className="relative">
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={currentQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`Enter quantity in ${product.metric}`}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                <div className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                  {product.metric}
                </div>
              </div>
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity}</p>
              )}
            </div>

            {/* Usage Preview */}
            {quantity && !isNaN(parseFloat(quantity)) && usageQty > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    After usage: <span className="font-semibold">
                      {remainingQuantity} {product.metric}
                    </span> remaining
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what the materials were used for..."
                rows={3}
                className={errors.reason ? 'border-red-500' : ''}
              />
              {errors.reason && (
                <p className="text-sm text-red-500">{errors.reason}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {reason.length}/500 characters
              </p>
            </div>

            {/* Low Stock Warning */}
            {willBeLowStock && !willBeOutOfStock && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This usage will result in low stock levels ({remainingQuantity} {product.metric} remaining).
                </AlertDescription>
              </Alert>
            )}

            {/* Out of Stock Warning */}
            {willBeOutOfStock && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Warning: This usage will result in zero or negative stock.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isRecording}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isRecording || usageQty <= 0 || willBeOutOfStock}
              >
                {isRecording ? 'Recording...' : 'Record Usage'}
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