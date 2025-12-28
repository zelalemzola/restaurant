"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Keyboard,
  Download,
  Move,
  Tag,
  Archive,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoadingCard } from "@/components/ui/loading";
import { ErrorBoundary, ErrorFallback } from "@/components/ui/error-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useGetProductsQuery,
  useGetProductGroupsQuery,
  useDeleteProductMutation,
  useBulkUpdateProductsMutation,
} from "@/lib/store/api";
import { ProductForm } from "@/components/inventory/ProductForm";
import { ProductDetails } from "@/components/inventory/ProductDetails";
import {
  AdvancedSearch,
  SearchFilter,
  SortOption,
} from "@/components/ui/advanced-search";
import { DataExport, ExportColumn } from "@/components/ui/data-export";
import { BulkOperations, BulkOperation } from "@/components/ui/bulk-operations";
import { KeyboardShortcutsHelp } from "@/components/ui/keyboard-shortcuts-help";
import {
  useKeyboardShortcuts,
  commonShortcuts,
  KeyboardShortcut,
} from "@/hooks/use-keyboard-shortcuts";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Advanced search and filtering
  const [searchFilters, setSearchFilters] = useState<SearchFilter[]>([]);
  const [sortOptions, setSortOptions] = useState<SortOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Refs for keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // Fetch products with filters
  const {
    data: productsResponse,
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery({
    search: search || undefined,
    type: typeFilter || undefined,
    groupId: groupFilter || undefined,
    page,
    limit: 10,
  });

  // Fetch product groups for filter dropdown
  const { data: groupsResponse } = useGetProductGroupsQuery();

  const [deleteProduct] = useDeleteProductMutation();
  const [bulkUpdateProducts] = useBulkUpdateProductsMutation();

  const products = productsResponse?.success
    ? productsResponse.data.products
    : [];
  console.log(products);
  const pagination = productsResponse?.success
    ? productsResponse.data.pagination
    : null;
  const productGroups = groupsResponse?.success ? groupsResponse.data : [];

  // Keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      ...commonShortcuts.create,
      action: () => setIsCreateDialogOpen(true),
    },
    {
      ...commonShortcuts.search,
      action: () => searchInputRef.current?.focus(),
    },
    {
      ...commonShortcuts.refresh,
      action: () => refetchProducts(),
    },
    {
      ...commonShortcuts.selectAll,
      action: () => {
        if (selectedIds.length === products.length) {
          setSelectedIds([]);
        } else {
          setSelectedIds(products.map((p) => p._id));
        }
      },
    },
    {
      ...commonShortcuts.help,
      action: () => {
        // Help dialog will be triggered by the KeyboardShortcutsHelp component
      },
    },
  ];

  useKeyboardShortcuts({ shortcuts });

  // Advanced search configuration
  const searchFields = [
    { key: "name", label: "Product Name", type: "text" as const },
    {
      key: "type",
      label: "Product Type",
      type: "select" as const,
      options: [
        { value: "stock", label: "Stock Items" },
        { value: "sellable", label: "Sellable Items" },
        { value: "combination", label: "Combination Items" },
      ],
    },
    {
      key: "currentQuantity",
      label: "Current Quantity",
      type: "number" as const,
    },
    { key: "minStockLevel", label: "Min Stock Level", type: "number" as const },
    { key: "costPrice", label: "Cost Price", type: "number" as const },
    { key: "sellingPrice", label: "Selling Price", type: "number" as const },
    {
      key: "groupId",
      label: "Product Group",
      type: "select" as const,
      options: productGroups.map((g) => ({ value: g._id, label: g.name })),
    },
  ];

  // Export columns configuration
  const exportColumns: ExportColumn[] = [
    { key: "name", label: "Product Name", type: "text" },
    { key: "type", label: "Type", type: "text" },
    { key: "currentQuantity", label: "Current Quantity", type: "number" },
    { key: "minStockLevel", label: "Min Stock Level", type: "number" },
    { key: "metric", label: "Metric", type: "text" },
    { key: "costPrice", label: "Cost Price", type: "currency" },
    { key: "sellingPrice", label: "Selling Price", type: "currency" },
    {
      key: "groupName",
      label: "Product Group",
      type: "text",
      format: (value: any, row?: any) => {
        if (
          typeof row.groupId === "object" &&
          row.groupId &&
          "name" in row.groupId
        ) {
          return (row.groupId as any).name;
        }
        return "Unknown Group";
      },
    },
    { key: "createdAt", label: "Created Date", type: "date" },
  ];

  // Bulk operations configuration
  const bulkOperations: BulkOperation[] = [
    {
      id: "bulk-edit-group",
      label: "Change Group",
      icon: <Move className="h-4 w-4" />,
      action: async (selectedIds, data) => {
        try {
          await bulkUpdateProducts({
            productIds: selectedIds,
            updates: { groupId: data.groupId },
          }).unwrap();
          toast({
            title: "Success",
            description: `Updated ${selectedIds.length} products successfully`,
          });
          setSelectedIds([]);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update products",
            variant: "destructive",
          });
        }
      },
      requiresData: true,
      dataFields: [
        {
          key: "groupId",
          label: "New Product Group",
          type: "select",
          required: true,
          options: productGroups.map((g) => ({ value: g._id, label: g.name })),
        },
      ],
    },
    {
      id: "bulk-adjust-stock",
      label: "Adjust Stock",
      icon: <Edit className="h-4 w-4" />,
      action: async (selectedIds, data) => {
        try {
          await bulkUpdateProducts({
            productIds: selectedIds,
            updates: {
              stockAdjustment: {
                adjustment: parseFloat(data.adjustment),
                reason: data.reason,
              },
            },
          }).unwrap();
          toast({
            title: "Success",
            description: `Adjusted stock for ${selectedIds.length} products`,
          });
          setSelectedIds([]);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to adjust stock",
            variant: "destructive",
          });
        }
      },
      requiresData: true,
      dataFields: [
        {
          key: "adjustment",
          label: "Stock Adjustment",
          type: "number",
          required: true,
        },
        {
          key: "reason",
          label: "Reason",
          type: "textarea",
          required: true,
        },
      ],
    },
    {
      id: "bulk-update-prices",
      label: "Update Prices",
      icon: <Tag className="h-4 w-4" />,
      action: async (selectedIds, data) => {
        try {
          const updates: any = {};
          if (data.priceType === "cost" || data.priceType === "both") {
            updates.costPriceAdjustment = {
              type: data.adjustmentType,
              value: parseFloat(data.adjustmentValue),
            };
          }
          if (data.priceType === "selling" || data.priceType === "both") {
            updates.sellingPriceAdjustment = {
              type: data.adjustmentType,
              value: parseFloat(data.adjustmentValue),
            };
          }

          await bulkUpdateProducts({
            productIds: selectedIds,
            updates,
          }).unwrap();

          toast({
            title: "Success",
            description: `Updated prices for ${selectedIds.length} products`,
          });
          setSelectedIds([]);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to update prices",
            variant: "destructive",
          });
        }
      },
      requiresData: true,
      dataFields: [
        {
          key: "priceType",
          label: "Price Type",
          type: "select",
          required: true,
          options: [
            { value: "cost", label: "Cost Price" },
            { value: "selling", label: "Selling Price" },
            { value: "both", label: "Both Prices" },
          ],
        },
        {
          key: "adjustmentType",
          label: "Adjustment Type",
          type: "select",
          required: true,
          options: [
            { value: "percentage", label: "Percentage" },
            { value: "fixed", label: "Fixed Amount" },
          ],
        },
        {
          key: "adjustmentValue",
          label: "Adjustment Value",
          type: "number",
          required: true,
        },
      ],
    },
    {
      id: "bulk-archive",
      label: "Archive",
      icon: <Archive className="h-4 w-4" />,
      action: async (selectedIds) => {
        try {
          await bulkUpdateProducts({
            productIds: selectedIds,
            updates: { archived: true },
          }).unwrap();
          toast({
            title: "Success",
            description: `Archived ${selectedIds.length} products`,
          });
          setSelectedIds([]);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to archive products",
            variant: "destructive",
          });
        }
      },
      requiresConfirmation: true,
      confirmationMessage:
        "Are you sure you want to archive the selected items? They will be hidden from active inventory.",
      variant: "secondary",
    },
    {
      id: "bulk-delete",
      label: "Delete",
      icon: <Trash2 className="h-4 w-4" />,
      action: async (selectedIds) => {
        try {
          await Promise.all(
            selectedIds.map((id) => deleteProduct(id).unwrap())
          );
          toast({
            title: "Success",
            description: `Deleted ${selectedIds.length} products`,
          });
          setSelectedIds([]);
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to delete products",
            variant: "destructive",
          });
        }
      },
      requiresConfirmation: true,
      confirmationMessage:
        "Are you sure you want to permanently delete the selected items? This action cannot be undone.",
      variant: "destructive",
    },
  ];

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const result = await deleteProduct(productId).unwrap();
      if (result.success) {
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const getProductTypeColor = (type: string) => {
    switch (type) {
      case "stock":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "sellable":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "combination":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStockLevelColor = (current: number, min: number) => {
    if (current <= min) return "text-red-600 font-semibold dark:text-red-400";
    if (current <= min * 1.5)
      return "text-yellow-600 font-semibold dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  if (productsError) {
    return (
      <ErrorBoundary fallback={ErrorFallback}>
        <AppLayout>
          <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-destructive">
                  Error loading products. Please try again.
                </p>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <AppLayout>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Products</h1>
              <p className="text-muted-foreground">
                Manage your inventory products and their details
              </p>
            </div>
            <div className="flex items-center gap-2">
              <KeyboardShortcutsHelp shortcuts={shortcuts} />
              <DataExport
                data={products}
                columns={exportColumns}
                filename="products"
                title="Export Products"
              />
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Product</DialogTitle>
                  </DialogHeader>
                  <ProductForm
                    onSuccess={() => {
                      setIsCreateDialogOpen(false);
                      toast({
                        title: "Success",
                        description: "Product created successfully",
                      });
                    }}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Advanced Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Advanced Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedSearch
                searchTerm={search}
                onSearchChange={setSearch}
                filters={searchFilters}
                onFiltersChange={setSearchFilters}
                sortOptions={sortOptions}
                onSortChange={setSortOptions}
                availableFields={searchFields}
                placeholder="Search products by name, type, or any field..."
              />
            </CardContent>
          </Card>

          {/* Bulk Operations */}
          {products.length > 0 && (
            <BulkOperations
              items={products}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              operations={bulkOperations}
            />
          )}

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Products
                {pagination && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({pagination.total} total)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <LoadingCard text="Loading products..." />
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products found. Create your first product to get started.
                </div>
              ) : (
                <>
                  {/* Mobile Card View */}
                  <div className="block lg:hidden space-y-4">
                    {products.map((product) => (
                      <Card key={product._id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {typeof product.groupId === "object" &&
                                product.groupId &&
                                "name" in product.groupId
                                  ? (product.groupId as any).name
                                  : "Unknown Group"}
                              </p>
                            </div>
                            <Badge
                              className={getProductTypeColor(product.type)}
                            >
                              {product.type}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">
                                Stock Level:
                              </span>
                              <div
                                className={getStockLevelColor(
                                  product.currentQuantity,
                                  product.minStockLevel
                                )}
                              >
                                {product.currentQuantity} /{" "}
                                {product.minStockLevel}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Metric:
                              </span>
                              <div>{product.metric}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Cost Price:
                              </span>
                              <div>
                                {product.costPrice
                                  ? `$${product.costPrice.toFixed(2)}`
                                  : "-"}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">
                                Selling Price:
                              </span>
                              <div>
                                {product.sellingPrice
                                  ? `$${product.sellingPrice.toFixed(2)}`
                                  : "-"}
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsDetailsDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={
                                selectedIds.length === products.length &&
                                products.length > 0
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedIds(products.map((p) => p._id));
                                } else {
                                  setSelectedIds([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Group</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Stock Level</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Cost Price</TableHead>
                          <TableHead>Selling Price</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product._id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.includes(product._id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedIds([
                                      ...selectedIds,
                                      product._id,
                                    ]);
                                  } else {
                                    setSelectedIds(
                                      selectedIds.filter(
                                        (id) => id !== product._id
                                      )
                                    );
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {product.name}
                            </TableCell>
                            <TableCell>
                              {typeof product.groupId === "object" &&
                              product.groupId &&
                              "name" in product.groupId
                                ? (product.groupId as any).name
                                : "Unknown Group"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getProductTypeColor(product.type)}
                              >
                                {product.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span
                                className={getStockLevelColor(
                                  product.currentQuantity,
                                  product.minStockLevel
                                )}
                              >
                                {product.currentQuantity} /{" "}
                                {product.minStockLevel}
                              </span>
                            </TableCell>
                            <TableCell>{product.metric}</TableCell>
                            <TableCell>
                              {product.costPrice
                                ? `$${product.costPrice.toFixed(2)}`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {product.sellingPrice
                                ? `$${product.sellingPrice.toFixed(2)}`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setIsDetailsDialogOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setIsEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteProduct(product._id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.pages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
                        {Math.min(
                          pagination.page * pagination.limit,
                          pagination.total
                        )}{" "}
                        of {pagination.total} products
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page <= 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm">
                          Page {pagination.page} of {pagination.pages}
                        </span>
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
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Edit Product Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Product</DialogTitle>
              </DialogHeader>
              {selectedProduct && (
                <ProductForm
                  product={selectedProduct}
                  onSuccess={() => {
                    setIsEditDialogOpen(false);
                    setSelectedProduct(null);
                    toast({
                      title: "Success",
                      description: "Product updated successfully",
                    });
                  }}
                  onCancel={() => {
                    setIsEditDialogOpen(false);
                    setSelectedProduct(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Product Details Dialog */}
          <Dialog
            open={isDetailsDialogOpen}
            onOpenChange={setIsDetailsDialogOpen}
          >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Product Details</DialogTitle>
              </DialogHeader>
              {selectedProduct && (
                <ProductDetails
                  product={selectedProduct}
                  onClose={() => {
                    setIsDetailsDialogOpen(false);
                    setSelectedProduct(null);
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}
