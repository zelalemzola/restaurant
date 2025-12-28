'use client';

import { useState, useMemo } from 'react';
import { useGetStockLevelsQuery, useRecordBulkStockUsageMutation } from '@/lib/store/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StockUsageDialog } from './StockUsageDialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Minus, 
  Package, 
  Search, 
  AlertTriangle, 
  ShoppingCart,
  Plus,
  Trash2,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageItem {
  productId: string;
  productName: string;
  metric: string;
  availableQuantity: number;
  minStockLevel: number;
  quantity: number;
  reason?: string;
}

export function SpendPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [bulkUsageItems, setBulkUsageItems] = useState<UsageItem[]>([]);
  const [showBulkMode, setShowBulkMode] = useState(false);
  const { toast } = useToast();

  const {
    data: stockData,
    isLoading,
    error,
    refetch,
  } = useGetStockLevelsQuery({
    limit: 100, // Get more items for the spend page
    search: searchTerm,
  });

  const [recordBulkUsage, { isLoading: isRecordingBulk }] = useRecordBulkStockUsageMutation();

  const stockItems = stockData?.success ? stockData.data.stockLevels : [];

  // Filter items that can be used (stock and combination items with quantity > 0)
  const usableItems = useMemo(() => {
    return stockItems.filter(item => 
      ['stock', 'combination'].includes(item.type) && item.currentQuantity > 0
    );
  }, [stockItems]);

  const handleSingleUsage = (productId: string) => {
    setSelectedProduct(productId);
    setUsageDialogOpen(true);
  };

  const handleAddToBulk = (item: typeof stockItems[0]) => {
    const existingIndex = bulkUsageItems.findIndex(usage => usage.productId === item._id);
    
    if (existingIndex >= 0) {
      // Update existing item
      const updatedItems = [...bulkUsageItems];
      updatedItems[existingIndex].quantity += 1;
      setBulkUsageItems(updatedItems);
    } else {
      // Add new item
      const newUsageItem: UsageItem = {
        productId: item._id,
        productName: item.name,
        metric: item.metric,
        availableQuantity: item.currentQuantity,
        minStockLevel: item.minStockLevel,
        quantity: 1,
        reason: '',
      };
      setBulkUsageItems([...bulkUsageItems, newUsageItem]);
    }
  };

  const handleUpdateBulkQuantity = (productId: string, quantity: number) => {
    setBulkUsageItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const handleUpdateBulkReason = (productId: string, reason: string) => {
    setBulkUsageItems(items =>
      items.map(item =>
        item.productId === productId
          ? { ...item, reason }
          : item
      )
    );
  };

  const handleRemoveFromBulk = (productId: string) => {
    setBulkUsageItems(items => items.filter(item => item.productId !== productId));
  };

  const handleBulkSubmit = async () => {
    if (bulkUsageItems.length === 0) return;

    // Validate all items
    const invalidItems = bulkUsageItems.filter(item => 
      item.quantity <= 0 || item.quantity > item.availableQuantity
    );

    if (invalidItems.length > 0) {
      toast({
        title: 'Invalid Quantities',
        description: 'Please check the quantities for all items.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await recordBulkUsage({
        items: bulkUsageItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          reason: item.reason || undefined,
        })),
      }).unwrap();

      if (result.success) {
        toast({
          title: 'Bulk Usage Recorded',
          description: `Successfully recorded usage for ${bulkUsageItems.length} items`,
        });
        setBulkUsageItems([]);
        setShowBulkMode(false);
        refetch();
      } else {
        toast({
          title: 'Error',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error recording bulk usage:', error);
      
      if (error?.data?.error?.code === 'INSUFFICIENT_STOCK') {
        toast({
          title: 'Insufficient Stock',
          description: 'One or more items have insufficient stock.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to record bulk usage. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const clearBulkUsage = () => {
    setBulkUsageItems([]);
    setShowBulkMode(false);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load inventory items</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Usage</h1>
          <p className="text-muted-foreground">
            Record materials used from inventory
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showBulkMode ? "default" : "outline"}
            onClick={() => setShowBulkMode(!showBulkMode)}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Bulk Mode
            {bulkUsageItems.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {bulkUsageItems.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bulk Usage Panel */}
      {showBulkMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Bulk Usage Cart
            </CardTitle>
            <CardDescription>
              Add multiple items and record usage in one transaction
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bulkUsageItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No items added to bulk usage</p>
                <p className="text-xs">Click the + button next to items below to add them</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bulkUsageItems.map((item) => {
                  const willBeLowStock = (item.availableQuantity - item.quantity) <= item.minStockLevel;
                  const willBeOutOfStock = (item.availableQuantity - item.quantity) <= 0;
                  
                  return (
                    <div key={item.productId} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Available: {item.availableQuantity} {item.metric}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0.01"
                          max={item.availableQuantity}
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateBulkQuantity(item.productId, parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">{item.metric}</span>
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Reason (optional)"
                          value={item.reason}
                          onChange={(e) => handleUpdateBulkReason(item.productId, e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        {willBeOutOfStock && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        {willBeLowStock && !willBeOutOfStock && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFromBulk(item.productId)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {bulkUsageItems.length} item{bulkUsageItems.length !== 1 ? 's' : ''} in cart
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={clearBulkUsage}>
                      Clear All
                    </Button>
                    <Button 
                      onClick={handleBulkSubmit}
                      disabled={isRecordingBulk || bulkUsageItems.length === 0}
                    >
                      {isRecordingBulk ? 'Recording...' : 'Record All Usage'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Inventory Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Available Inventory
          </CardTitle>
          <CardDescription>
            Items available for usage recording
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading inventory items...</div>
            </div>
          ) : usableItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No usable inventory items found</p>
              {searchTerm && (
                <p className="text-xs">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {usableItems.map((item) => {
                const isInBulkCart = bulkUsageItems.some(usage => usage.productId === item._id);
                
                return (
                  <div
                    key={item._id}
                    className={cn(
                      'p-4 border rounded-lg transition-all duration-200',
                      item.stockStatus === 'low-stock' ? 'border-yellow-200 bg-yellow-50' :
                      item.stockStatus === 'out-of-stock' ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-white hover:border-gray-300',
                      isInBulkCart && 'ring-2 ring-blue-200 border-blue-300'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <p className="text-xs text-muted-foreground">{item.group.name}</p>
                      </div>
                      <Badge 
                        variant={item.type === 'stock' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {item.type}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available:</span>
                        <span className={cn(
                          'font-medium',
                          item.isLowStock ? 'text-yellow-600' : 'text-green-600'
                        )}>
                          {item.currentQuantity} {item.metric}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min Level:</span>
                        <span>{item.minStockLevel} {item.metric}</span>
                      </div>
                    </div>

                    {/* Stock Level Indicator */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          item.stockStatus === 'low-stock' ? 'bg-yellow-500' :
                          'bg-green-500'
                        )}
                        style={{
                          width: `${Math.max(
                            Math.min((item.currentQuantity / (item.minStockLevel * 2)) * 100, 100),
                            5
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSingleUsage(item._id)}
                        className="flex-1"
                      >
                        <Minus className="h-3 w-3 mr-1" />
                        Use
                      </Button>
                      {showBulkMode && (
                        <Button
                          variant={isInBulkCart ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleAddToBulk(item)}
                          className="px-3"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {item.isLowStock && (
                      <Alert className="mt-3 py-2">
                        <AlertTriangle className="h-3 w-3" />
                        <AlertDescription className="text-xs">
                          Low stock warning
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Usage Dialog */}
      <StockUsageDialog
        open={usageDialogOpen}
        onOpenChange={setUsageDialogOpen}
        productId={selectedProduct}
        onSuccess={() => {
          refetch();
          setUsageDialogOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}