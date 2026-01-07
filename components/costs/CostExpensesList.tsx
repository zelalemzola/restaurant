"use client";

import { useState } from "react";
import { format } from "date-fns";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  Calendar,
  DollarSign,
  Package,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface CostExpense {
  _id: string;
  productId: {
    _id: string;
    name: string;
    type: string;
  };
  costPrice: number;
  quantity: number;
  totalAmount: number;
  category: "inventory" | "operational" | "overhead";
  recordedAt: string;
  updatedBy?: string;
  metadata: {
    productName: string;
    productType: string;
    costPerUnit: number;
    previousCostPrice?: number;
    reason?: string;
  };
}

interface CostExpensesListProps {
  costExpenses: CostExpense[];
  isLoading: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onFilterChange?: (filters: any) => void;
  onPageChange?: (page: number) => void;
}

const expenseCategories = [
  {
    value: "inventory",
    label: "Inventory",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "operational",
    label: "Operational",
    color: "bg-green-100 text-green-800",
  },
  {
    value: "overhead",
    label: "Overhead",
    color: "bg-orange-100 text-orange-800",
  },
];

export function CostExpensesList({
  costExpenses,
  isLoading,
  pagination,
  onFilterChange,
  onPageChange,
}: CostExpensesListProps) {
  const [filters, setFilters] = useState({
    category: "",
    productId: "",
    startDate: "",
    endDate: "",
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = {
      ...filters,
      [key]: value,
    };
    setFilters(newFilters);
    onFilterChange?.(newFilters);
  };

  const getCategoryBadge = (category: string) => {
    const categoryInfo = expenseCategories.find(
      (cat) => cat.value === category
    );
    return (
      <Badge className={categoryInfo?.color || "bg-gray-100 text-gray-800"}>
        {categoryInfo?.label || category}
      </Badge>
    );
  };

  const getProductTypeBadge = (type: string) => {
    const colors = {
      stock: "bg-blue-100 text-blue-800",
      sellable: "bg-green-100 text-green-800",
      combination: "bg-purple-100 text-purple-800",
    };
    return (
      <Badge
        className={
          colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800"
        }
      >
        {type}
      </Badge>
    );
  };

  const calculateTotalAmount = () => {
    return costExpenses.reduce(
      (total, expense) => total + expense.totalAmount,
      0
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  handleFilterChange("category", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  handleFilterChange("startDate", e.target.value)
                }
              />
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  const resetFilters = {
                    category: "",
                    productId: "",
                    startDate: "",
                    endDate: "",
                  };
                  setFilters(resetFilters);
                  onFilterChange?.(resetFilters);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {costExpenses.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">
                  Total Cost Expenses (Current Page):
                </span>
                <span className="text-lg font-bold text-green-600">
                  ${calculateTotalAmount().toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {costExpenses.length} of {pagination?.total || 0} cost
                expenses
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cost Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : costExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No cost expenses found</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-4">
                {costExpenses.map((expense) => (
                  <Card key={expense._id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">
                            {expense.metadata.productName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {expense.metadata.reason || "Cost price updated"}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {getCategoryBadge(expense.category)}
                          {getProductTypeBadge(expense.metadata.productType)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">
                            Cost Price:
                          </span>
                          <div className="font-medium">
                            ${expense.costPrice.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Quantity:
                          </span>
                          <div>{expense.quantity}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Total Amount:
                          </span>
                          <div className="font-bold text-green-600">
                            ${expense.totalAmount.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <div>
                            {format(
                              new Date(expense.recordedAt),
                              "MMM dd, yyyy"
                            )}
                          </div>
                        </div>
                      </div>

                      {expense.metadata.previousCostPrice && (
                        <div className="text-xs text-muted-foreground">
                          Previous cost: $
                          {expense.metadata.previousCostPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Cost Price</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Previous Cost</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Updated By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costExpenses.map((expense) => (
                      <TableRow key={expense._id}>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium truncate">
                              {expense.metadata.productName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {getProductTypeBadge(
                                expense.metadata.productType
                              )}
                              <Package className="h-3 w-3 text-muted-foreground" />
                            </div>
                            {expense.metadata.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {expense.metadata.reason}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getCategoryBadge(expense.category)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            ${expense.costPrice.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>{expense.quantity}</TableCell>
                        <TableCell>
                          <span className="font-bold text-green-600">
                            ${expense.totalAmount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {expense.metadata.previousCostPrice ? (
                            <span className="text-muted-foreground">
                              ${expense.metadata.previousCostPrice.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(
                              new Date(expense.recordedAt),
                              "MMM dd, yyyy"
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">
                            {expense.updatedBy || "System"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange?.(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPageChange?.(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
