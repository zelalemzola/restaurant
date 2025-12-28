"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  useGetCostOperationsQuery,
  useDeleteCostOperationMutation,
} from "@/lib/store/api";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Trash2,
  Filter,
  Calendar,
  DollarSign,
  Repeat,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CostOperation, CostCategory } from "@/types/cost";

interface CostOperationsListProps {
  onEdit: (costOperation: CostOperation) => void;
}

const costCategories: { value: CostCategory; label: string; color: string }[] =
  [
    { value: "rent", label: "Rent", color: "bg-blue-100 text-blue-800" },
    { value: "salary", label: "Salary", color: "bg-green-100 text-green-800" },
    {
      value: "utilities",
      label: "Utilities",
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      value: "maintenance",
      label: "Maintenance",
      color: "bg-orange-100 text-orange-800",
    },
    { value: "other", label: "Other", color: "bg-gray-100 text-gray-800" },
  ];

export function CostOperationsList({ onEdit }: CostOperationsListProps) {
  const [filters, setFilters] = useState({
    category: "",
    type: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 10,
  });

  const {
    data: response,
    isLoading,
    error,
  } = useGetCostOperationsQuery(filters);
  const [deleteCostOperation, { isLoading: isDeleting }] =
    useDeleteCostOperationMutation();

  const costOperations = response?.success ? response.data.costOperations : [];
  const pagination = response?.success ? response.data.pagination : null;

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filtering
    }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCostOperation(id).unwrap();
    } catch (error) {
      console.error("Failed to delete cost operation:", error);
    }
  };

  const getCategoryBadge = (category: CostCategory) => {
    const categoryInfo = costCategories.find((cat) => cat.value === category);
    return (
      <Badge className={categoryInfo?.color || "bg-gray-100 text-gray-800"}>
        {categoryInfo?.label || category}
      </Badge>
    );
  };

  const getTypeBadge = (type: string, recurringPeriod?: string) => {
    if (type === "recurring") {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Repeat className="h-3 w-3" />
          {recurringPeriod || "Recurring"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        One-time
      </Badge>
    );
  };

  const calculateTotalAmount = () => {
    return costOperations.reduce((total, cost) => total + cost.amount, 0);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load cost operations</p>
        </CardContent>
      </Card>
    );
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  {costCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) =>
                  handleFilterChange("type", value === "all" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="one-time">One-time</SelectItem>
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
                onClick={() =>
                  setFilters({
                    category: "",
                    type: "",
                    startDate: "",
                    endDate: "",
                    page: 1,
                    limit: 10,
                  })
                }
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {costOperations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium">
                  Total Amount (Current Page):
                </span>
                <span className="text-lg font-bold text-green-600">
                  ${calculateTotalAmount().toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {costOperations.length} of {pagination?.total || 0} cost
                operations
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : costOperations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No cost operations found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costOperations.map((cost) => (
                    <TableRow key={cost._id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium truncate">
                            {cost.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Added{" "}
                            {format(new Date(cost.createdAt), "MMM dd, yyyy")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(cost.category)}</TableCell>
                      <TableCell>
                        {getTypeBadge(cost.type, cost.recurringPeriod)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          ${cost.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(cost.date), "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(cost)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Cost Operation
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this cost
                                  operation? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(cost._id)}
                                  disabled={isDeleting}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
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
