"use client";

import { useState, useEffect } from "react";
import {
  useGetStockLevelsQuery,
  useGetProductGroupsQuery,
} from "@/lib/store/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { StockAdjustmentDialog } from "@/components/inventory/StockAdjustmentDialog";
import { StockAlertsPanel } from "@/components/inventory/StockAlertsPanel";
import { useStockMonitoring } from "@/hooks/use-stock-monitoring";
import {
  Search,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Bell,
} from "lucide-react";

export default function StockLevelsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [adjustmentDialogOpen, setAdjustmentDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  const limit = 20;

  // Initialize stock monitoring
  const { stockAlerts, isMonitoring } = useStockMonitoring({
    enabled: autoRefresh,
    showToastAlerts: true,
  });

  const {
    data: stockData,
    isLoading,
    error,
    refetch,
  } = useGetStockLevelsQuery(
    {
      page,
      limit,
      search: search || undefined,
      type: typeFilter || undefined,
      groupId: groupFilter || undefined,
      stockStatus: statusFilter || undefined,
    },
    {
      // Enable real-time updates with polling every 30 seconds
      pollingInterval: autoRefresh ? 30000 : 0,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );

  const { data: groupsData } = useGetProductGroupsQuery();

  // Update last updated timestamp when data changes
  useEffect(() => {
    if (stockData?.success) {
      setLastUpdated(new Date());
    }
  }, [stockData]);

  // Auto-refresh toggle
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const toggleAlertsPanel = () => {
    setShowAlertsPanel(!showAlertsPanel);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when searching
  };

  const handleFilterChange = () => {
    setPage(1); // Reset to first page when filtering
  };

  const handleAdjustStock = (productId: string) => {
    setSelectedProduct(productId);
    setAdjustmentDialogOpen(true);
  };

  const getStatusBadge = (
    status: string,
    currentQuantity: number,
    minStockLevel: number
  ) => {
    const percentage =
      minStockLevel > 0 ? (currentQuantity / minStockLevel) * 100 : 100;

    switch (status) {
      case "in-stock":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 hover:bg-green-200"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            In Stock
            {percentage > 150 && (
              <TrendingUp className="w-3 h-3 ml-1 text-green-600" />
            )}
          </Badge>
        );
      case "low-stock":
        return (
          <Badge
            variant="destructive"
            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Low Stock
            <TrendingDown className="w-3 h-3 ml-1 text-yellow-600" />
          </Badge>
        );
      case "out-of-stock":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Out of Stock
          </Badge>
        );
      default:
        return null;
    }
  };

  const getStockLevelBar = (currentQuantity: number, minStockLevel: number) => {
    const percentage =
      minStockLevel > 0
        ? Math.min((currentQuantity / (minStockLevel * 2)) * 100, 100)
        : 100;
    let colorClass = "bg-green-500";

    if (currentQuantity <= minStockLevel) {
      colorClass = currentQuantity === 0 ? "bg-red-500" : "bg-yellow-500";
    }

    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
    );
  };

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "stock":
        return "bg-blue-100 text-blue-800";
      case "combination":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load stock levels. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const stockLevels = stockData?.success ? stockData.data.stockLevels : [];
  const pagination = stockData?.success ? stockData.data.pagination : null;
  const summary = stockData?.success ? stockData.data.summary : null;
  const groups = groupsData?.success ? groupsData.data : [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Levels</h1>
          <p className="text-muted-foreground">
            Monitor inventory levels and manage stock adjustments
            {isMonitoring && (
              <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                Live monitoring active
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Last updated: {formatLastUpdated(lastUpdated)}
          </div>
          <Button
            onClick={toggleAlertsPanel}
            variant="outline"
            size="sm"
            className="relative"
          >
            <Bell className="w-4 h-4 mr-2" />
            Alerts
            {stockAlerts.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {stockAlerts.length > 9 ? "9+" : stockAlerts.length}
              </Badge>
            )}
          </Button>
          <Button
            onClick={toggleAutoRefresh}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`}
            />
            {autoRefresh ? "Auto" : "Manual"}
          </Button>
          <Button onClick={() => refetch()} variant="outline">
            <Package className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Alerts Panel */}
      {showAlertsPanel && (
        <StockAlertsPanel maxAlerts={5} showControls={true} />
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalItems}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.inStockItems}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {summary.lowStockItems}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Out of Stock
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary.outOfStockItems}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search inventory items</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={typeFilter || "all"}
              onValueChange={(value) => {
                setTypeFilter(value === "all" ? "" : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="stock">Stock Items</SelectItem>
                <SelectItem value="combination">Combination Items</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={groupFilter || "all"}
              onValueChange={(value) => {
                setGroupFilter(value === "all" ? "" : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group._id} value={group._id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) => {
                setStatusFilter(value === "all" ? "" : value);
                handleFilterChange();
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setGroupFilter("");
                setStatusFilter("");
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            Current stock levels for all inventory items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                Loading stock levels...
              </div>
            </div>
          ) : stockLevels.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">
                No inventory items found
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Group</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockLevels.map((item) => (
                    <TableRow
                      key={item._id}
                      className={
                        item.stockStatus === "out-of-stock"
                          ? "bg-red-50"
                          : item.stockStatus === "low-stock"
                          ? "bg-yellow-50"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.group.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getTypeColor(item.type)}
                        >
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStockLevelBar(
                            item.currentQuantity,
                            item.minStockLevel
                          )}
                          <div className="text-xs text-muted-foreground">
                            {item.minStockLevel > 0
                              ? `${Math.round(
                                  (item.currentQuantity / item.minStockLevel) *
                                    100
                                )}% of min level`
                              : "No min level set"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            item.isLowStock
                              ? "text-red-600 font-semibold"
                              : item.currentQuantity > item.minStockLevel * 1.5
                              ? "text-green-600 font-semibold"
                              : ""
                          }
                        >
                          {item.currentQuantity} {item.metric}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.minStockLevel} {item.metric}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(
                          item.stockStatus,
                          item.currentQuantity,
                          item.minStockLevel
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustStock(item._id)}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Adjust
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} items
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page <= 1}
                      >
                        Previous
                      </Button>
                      <div className="text-sm">
                        Page {pagination.page} of {pagination.pages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={adjustmentDialogOpen}
        onOpenChange={setAdjustmentDialogOpen}
        productId={selectedProduct}
        onSuccess={() => {
          refetch();
          setAdjustmentDialogOpen(false);
          setSelectedProduct(null);
        }}
      />
    </div>
  );
}
