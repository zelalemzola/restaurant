"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { useGetStockLevelsQuery } from "@/lib/store/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StockLevelIndicator } from "./StockLevelIndicator";
import { StockAdjustmentDialog } from "./StockAdjustmentDialog";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StockLevelsDashboardProps {
  className?: string;
  maxItems?: number;
  showActions?: boolean;
  variant?: "grid" | "list" | "compact";
  filterStatus?: "all" | "low-stock" | "out-of-stock" | "in-stock";
}

export const StockLevelsDashboard = memo(function StockLevelsDashboard({
  className,
  maxItems = 12,
  showActions = true,
  variant = "grid",
  filterStatus = "all",
}: StockLevelsDashboardProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);

  // Memoize query parameters to prevent unnecessary re-renders
  const queryParams = useMemo(
    () => ({
      limit: maxItems,
      stockStatus: filterStatus !== "all" ? filterStatus : undefined,
    }),
    [maxItems, filterStatus]
  );

  const {
    data: stockData,
    isLoading,
    error,
    refetch,
  } = useGetStockLevelsQuery(queryParams);

  // Memoize handlers to prevent child re-renders
  const handleAdjustStock = useCallback((productId: string) => {
    setSelectedProduct(productId);
    setAdjustmentDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((productId: string) => {
    // This could navigate to a detailed product page
    console.log("View details for product:", productId);
  }, []);

  const handleDialogClose = useCallback(() => {
    setAdjustmentDialogOpen(false);
  }, []);

  const handleDialogSuccess = useCallback(() => {
    refetch();
    setAdjustmentDialogOpen(false);
    setSelectedProduct(null);
  }, [refetch]);

  // Memoize data extraction to prevent unnecessary re-renders
  const { stockLevels, summary } = useMemo(() => {
    if (!stockData?.success) {
      return { stockLevels: [], summary: null };
    }
    return {
      stockLevels: stockData.data.stockLevels,
      summary: stockData.data.summary,
    };
  }, [stockData]);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Failed to load stock levels
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Levels
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading stock levels...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Memoize render functions to prevent unnecessary re-renders
  const renderGridView = useCallback(
    () => (
      <ErrorBoundary>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stockLevels.map((item) => (
            <div key={item._id} className="relative">
              <StockLevelIndicator
                currentQuantity={item.currentQuantity}
                minStockLevel={item.minStockLevel}
                metric={item.metric}
                productName={item.name}
                showProgress={true}
                showBadge={true}
                size="md"
              />
              {showActions && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(item._id)}
                    className="h-6 w-6 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAdjustStock(item._id)}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ErrorBoundary>
    ),
    [stockLevels, showActions, handleViewDetails, handleAdjustStock]
  );

  const renderListView = useCallback(
    () => (
      <ErrorBoundary>
        <div className="space-y-3">
          {stockLevels.map((item) => (
            <div
              key={item._id}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border",
                item.stockStatus === "out-of-stock"
                  ? "bg-red-50 border-red-200"
                  : item.stockStatus === "low-stock"
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-white"
              )}
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="flex-1">
                  <h4 className="font-medium">{item.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {item.group.name}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold",
                      item.isLowStock ? "text-red-600" : "text-green-600"
                    )}
                  >
                    {item.currentQuantity} {item.metric}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Min: {item.minStockLevel} {item.metric}
                  </p>
                </div>
                <div className="w-24">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        item.stockStatus === "out-of-stock"
                          ? "bg-red-500"
                          : item.stockStatus === "low-stock"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      )}
                      style={{
                        width: `${Math.max(
                          Math.min(
                            (item.currentQuantity / (item.minStockLevel * 2)) *
                              100,
                            100
                          ),
                          2
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
              {showActions && (
                <div className="flex gap-1 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(item._id)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAdjustStock(item._id)}
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Adjust
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ErrorBoundary>
    ),
    [stockLevels, showActions, handleViewDetails, handleAdjustStock]
  );

  const renderCompactView = useCallback(
    () => (
      <ErrorBoundary>
        <div className="space-y-2">
          {stockLevels.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between py-2 px-3 rounded border"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-3 w-3 rounded-full",
                    item.stockStatus === "out-of-stock"
                      ? "bg-red-500"
                      : item.stockStatus === "low-stock"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  )}
                />
                <span className="font-medium text-sm">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  {item.currentQuantity} {item.metric}
                </span>
                {showActions && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAdjustStock(item._id)}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ErrorBoundary>
    ),
    [stockLevels, showActions, handleAdjustStock]
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Levels
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="ml-2">
                  {filterStatus.replace("-", " ")}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {filterStatus === "all"
                ? "Current inventory levels across all products"
                : `Products with ${filterStatus.replace("-", " ")} status`}
            </CardDescription>
          </div>
          {summary && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{summary.inStockItems}</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>{summary.lowStockItems}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>{summary.outOfStockItems}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stockLevels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No stock items found</p>
          </div>
        ) : (
          <>
            {variant === "grid" && renderGridView()}
            {variant === "list" && renderListView()}
            {variant === "compact" && renderCompactView()}
          </>
        )}
      </CardContent>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={handleDialogClose}
        productId={selectedProduct}
        onSuccess={handleDialogSuccess}
      />
    </Card>
  );
});
