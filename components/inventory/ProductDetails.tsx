'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar, Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import type { Product } from '@/types';

interface ProductDetailsProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetails({ product, onClose }: ProductDetailsProps) {
  const getProductTypeColor = (type: string) => {
    switch (type) {
      case 'stock':
        return 'bg-blue-100 text-blue-800';
      case 'sellable':
        return 'bg-green-100 text-green-800';
      case 'combination':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatus = () => {
    if (product.currentQuantity <= product.minStockLevel) {
      return {
        status: 'Low Stock',
        color: 'text-red-600',
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
      };
    } else if (product.currentQuantity <= product.minStockLevel * 1.5) {
      return {
        status: 'Medium Stock',
        color: 'text-yellow-600',
        icon: TrendingDown,
        bgColor: 'bg-yellow-50',
      };
    } else {
      return {
        status: 'Good Stock',
        color: 'text-green-600',
        icon: TrendingUp,
        bgColor: 'bg-green-50',
      };
    }
  };

  const stockStatus = getStockStatus();
  const StockIcon = stockStatus.icon;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateProfitMargin = () => {
    if (product.costPrice && product.sellingPrice && product.costPrice > 0) {
      return (((product.sellingPrice - product.costPrice) / product.costPrice) * 100).toFixed(1);
    }
    return null;
  };

  const profitMargin = calculateProfitMargin();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <p className="text-muted-foreground">
            {typeof product.groupId === 'object' && product.groupId && 'name' in product.groupId
              ? (product.groupId as any).name
              : 'Unknown Group'}
          </p>
        </div>
        <Badge className={getProductTypeColor(product.type)}>
          {product.type}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stock Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-3 rounded-lg ${stockStatus.bgColor}`}>
              <div className="flex items-center gap-2">
                <StockIcon className={`h-5 w-5 ${stockStatus.color}`} />
                <span className={`font-medium ${stockStatus.color}`}>
                  {stockStatus.status}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Quantity:</span>
                <span className="font-medium">
                  {product.currentQuantity} {product.metric}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Minimum Level:</span>
                <span className="font-medium">
                  {product.minStockLevel} {product.metric}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit of Measurement:</span>
                <span className="font-medium">{product.metric}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Stock Level Progress</h4>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    product.currentQuantity <= product.minStockLevel
                      ? 'bg-red-500'
                      : product.currentQuantity <= product.minStockLevel * 1.5
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      (product.currentQuantity / (product.minStockLevel * 2)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {product.currentQuantity > product.minStockLevel * 2
                  ? 'Well stocked'
                  : `${(product.minStockLevel * 2 - product.currentQuantity).toFixed(1)} ${
                      product.metric
                    } to optimal level`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pricing Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.costPrice && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost Price:</span>
                <span className="font-medium">
                  ${product.costPrice.toFixed(2)} per {product.metric}
                </span>
              </div>
            )}

            {product.sellingPrice && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selling Price:</span>
                <span className="font-medium">
                  ${product.sellingPrice.toFixed(2)} per {product.metric}
                </span>
              </div>
            )}

            {profitMargin && (
              <>
                <Separator />
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Profit Margin:</span>
                    <span
                      className={`font-bold ${
                        parseFloat(profitMargin) > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {profitMargin}%
                    </span>
                  </div>
                  {product.costPrice && product.sellingPrice && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Profit: ${(product.sellingPrice - product.costPrice).toFixed(2)} per{' '}
                      {product.metric}
                    </p>
                  )}
                </div>
              </>
            )}

            {product.type === 'stock' && !product.sellingPrice && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  This is a stock item used for production. No selling price required.
                </p>
              </div>
            )}

            {product.type === 'sellable' && !product.costPrice && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  This is a sellable item. Cost price is optional for finished products.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground">Created:</span>
              <p className="font-medium">{formatDate(product.createdAt)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <p className="font-medium">{formatDate(product.updatedAt)}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <h4 className="font-medium">Product Type Description</h4>
            <p className="text-sm text-muted-foreground">
              {product.type === 'stock' &&
                'Stock items are raw materials or ingredients used in production. They require cost price for inventory valuation but no selling price since they are not sold directly to customers.'}
              {product.type === 'sellable' &&
                'Sellable items are finished products sold to customers. They require selling price for sales transactions and may optionally have cost price for profit calculations.'}
              {product.type === 'combination' &&
                'Combination items serve dual purposes - they can be used as raw materials in production and also sold directly to customers. They require both cost price and selling price.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}