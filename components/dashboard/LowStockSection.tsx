"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  Package,
  Plus,
  RefreshCw,
  TrendingDown,
  Clock,
  DollarSign,
} from "lucide-react";
import { LowStockItem } from "@/lib/services/lowStockMonitor";

interface LowStockSectionProps {
  className?: string;
  maxItems?: number;
  showSuggestions?: boolean;
}

export function LowStockSection({
  className,
  maxItems = 5,
  showSuggestions = true,
}: LowStockSectionProps) {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [restockingItems, setRestockingItems] = useState<Set<string>>(
    new Set()
  );
  const { toast } = useToast();

  // Fetch low stock items
  const fetchLowStockItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "/api/inventory/low-stock?includeSuggestions=true"
      );
      const data = await response.json();

      if (data.success) {
        setLowStockItems(data.data.lowStockItems.slice(0, maxItems));
        setError("");
      } else {
        setError(data.error.message);
      }
    } catch (error) {
      setError("Failed to fetch low stock items");
      console.error("Error fetching low stock items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Restock item
  const handleRestock = async (productId: string, quantity: number) => {
    try {
      setRestockingItems((prev) => new Set(prev).add(productId));

      const response = await fetch("/api/inventory/low-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restock",
          productId,
          quantity,
          reason: "Dashboard quick restock",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Item restocked successfully",
        });

        // Refresh the list
        fetchLowStockItems();
      } else {
        toast({
          title: "Error",
          description: data.error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restock item",
        variant: "destructive",
      });
    } finally {
      setRestockingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Get urgency color
  const getUrgencyColor = (urgency: "critical" | "warning" | "low") => {
    switch (urgency) {
      case "critical":
        return "destructive";
      case "warning":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Get urgency icon
  const getUrgencyIcon = (urgency: "critical" | "warning" | "low") => {
    switch (urgency) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <TrendingDown className="h-4 w-4" />;
      case "low":
        return <Package className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    fetchLowStockItems();

    // Set up polling for real-time updates
    const interval = setInterval(fetchLowStockItems, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [maxItems]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Low Stock Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Low Stock Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Low Stock Items
            {lowStockItems.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {lowStockItems.length}
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLowStockItems}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {lowStockItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>All items are well stocked!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lowStockItems.map((item) => (
              <LowStockItemCard
                key={item._id}
                item={item}
                onRestock={handleRestock}
                isRestocking={restockingItems.has(item._id)}
                getUrgencyColor={getUrgencyColor}
                getUrgencyIcon={getUrgencyIcon}
              />
            ))}

            {lowStockItems.length >= maxItems && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm" asChild>
                  <a href="/dashboard/inventory/stock-levels">
                    View All Stock Levels
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface LowStockItemCardProps {
  item: LowStockItem;
  onRestock: (productId: string, quantity: number) => void;
  isRestocking: boolean;
  getUrgencyColor: (urgency: "critical" | "warning" | "low") => string;
  getUrgencyIcon: (urgency: "critical" | "warning" | "low") => React.ReactNode;
}

function LowStockItemCard({
  item,
  onRestock,
  isRestocking,
  getUrgencyColor,
  getUrgencyIcon,
}: LowStockItemCardProps) {
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState(item.suggestedRestock);

  const handleRestockSubmit = () => {
    if (restockQuantity > 0) {
      onRestock(item._id, restockQuantity);
      setIsRestockDialogOpen(false);
    }
  };

  const estimatedCost = (item.costPrice || 0) * restockQuantity;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h4 className="font-medium">{item.name}</h4>
          <Badge variant={getUrgencyColor(item.urgencyLevel) as any}>
            <div className="flex items-center gap-1">
              {getUrgencyIcon(item.urgencyLevel)}
              {item.urgencyLevel}
            </div>
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Current:{" "}
            <strong>
              {item.currentQuantity} {item.metric}
            </strong>
          </span>
          <span>
            Min:{" "}
            <strong>
              {item.minStockLevel} {item.metric}
            </strong>
          </span>
          {item.daysUntilEmpty !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.daysUntilEmpty === 0
                ? "Out of stock"
                : `${item.daysUntilEmpty} days left`}
            </span>
          )}
        </div>

        {item.groupId && (
          <div className="text-xs text-muted-foreground mt-1">
            Group: {item.groupId.name}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Dialog
          open={isRestockDialogOpen}
          onOpenChange={setIsRestockDialogOpen}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              disabled={isRestocking}
              className="flex items-center gap-1"
            >
              {isRestocking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Restock
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Restock {item.name}</DialogTitle>
              <DialogDescription>
                Add inventory to bring this item back to adequate stock levels.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={restockQuantity}
                  onChange={(e) =>
                    setRestockQuantity(parseInt(e.target.value) || 0)
                  }
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm text-muted-foreground">
                  Suggested
                </Label>
                <div className="col-span-3 text-sm">
                  {item.suggestedRestock} {item.metric}
                </div>
              </div>

              {item.costPrice && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-sm text-muted-foreground">
                    Est. Cost
                  </Label>
                  <div className="col-span-3 text-sm flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {estimatedCost.toFixed(2)}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-sm text-muted-foreground">
                  New Total
                </Label>
                <div className="col-span-3 text-sm">
                  {item.currentQuantity + restockQuantity} {item.metric}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRestockDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRestockSubmit}
                disabled={restockQuantity <= 0}
              >
                Restock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
