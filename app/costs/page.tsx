"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  DollarSign,
  TrendingUp,
  Calendar,
  Receipt,
  Package,
  BarChart3,
} from "lucide-react";
import { CostOperationForm } from "@/components/costs/CostOperationForm";
import { CostOperationsList } from "@/components/costs/CostOperationsList";
import { useGetCostOperationsQuery } from "@/lib/store/api";
import type { CostOperation } from "@/types/cost";

export default function CostsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCost, setEditingCost] = useState<CostOperation | undefined>();

  // Get summary data for the current month
  const currentMonth = new Date();
  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );
  const endOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const { data: monthlyData } = useGetCostOperationsQuery({
    startDate: startOfMonth.toISOString().split("T")[0],
    endDate: endOfMonth.toISOString().split("T")[0],
    limit: 1000, // Get all for summary
  });

  const { data: recurringData } = useGetCostOperationsQuery({
    type: "recurring",
    limit: 1000, // Get all recurring costs
  });

  // Fetch cost expenses summary
  const [costExpensesSummary, setCostExpensesSummary] = useState<any>(null);
  const [costExpensesLoading, setCostExpensesLoading] = useState(true);
  const [costExpensesError, setCostExpensesError] = useState<string>("");

  useEffect(() => {
    const fetchCostExpensesSummary = async () => {
      try {
        setCostExpensesLoading(true);
        setCostExpensesError("");
        const params = new URLSearchParams({
          startDate: startOfMonth.toISOString().split("T")[0],
          endDate: endOfMonth.toISOString().split("T")[0],
        });
        const response = await fetch(`/api/cost-expenses/summary?${params}`);
        const data = await response.json();
        if (data.success) {
          setCostExpensesSummary(data.data);
          console.log("Cost expenses summary:", data.data); // Debug log
        } else {
          setCostExpensesError(
            data.error?.message || "Failed to fetch cost expenses"
          );
        }
      } catch (error) {
        console.error("Failed to fetch cost expenses summary:", error);
        setCostExpensesError("Failed to fetch cost expenses summary");
      } finally {
        setCostExpensesLoading(false);
      }
    };

    fetchCostExpensesSummary();
  }, [startOfMonth, endOfMonth]);

  const monthlyCosts = monthlyData?.success
    ? monthlyData.data.costOperations
    : [];
  const recurringCosts = recurringData?.success
    ? recurringData.data.costOperations
    : [];

  const handleAddCost = () => {
    setEditingCost(undefined);
    setIsFormOpen(true);
  };

  const handleEditCost = (cost: CostOperation) => {
    setEditingCost(cost);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingCost(undefined);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingCost(undefined);
  };

  // Calculate summary statistics
  const monthlyTotal = monthlyCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const inventoryExpensesTotal =
    costExpensesSummary?.totalExpenses?.grandTotal || 0;
  const totalMonthlyWithInventory = monthlyTotal + inventoryExpensesTotal;

  const recurringMonthlyTotal = recurringCosts
    .filter((cost) => cost.recurringPeriod === "monthly")
    .reduce((sum, cost) => sum + cost.amount, 0);
  const recurringWeeklyTotal = recurringCosts
    .filter((cost) => cost.recurringPeriod === "weekly")
    .reduce((sum, cost) => sum + cost.amount * 4.33, 0); // Approximate monthly
  const recurringYearlyTotal = recurringCosts
    .filter((cost) => cost.recurringPeriod === "yearly")
    .reduce((sum, cost) => sum + cost.amount / 12, 0); // Monthly portion

  const totalRecurringMonthly =
    recurringMonthlyTotal + recurringWeeklyTotal + recurringYearlyTotal;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cost Operations</h1>
          <p className="text-muted-foreground">
            Manage your business expenses and operational costs
          </p>
        </div>
        <Button onClick={handleAddCost}>
          <Plus className="mr-2 h-4 w-4" />
          Add Cost
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalMonthlyWithInventory.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="text-xs text-muted-foreground mt-1 space-y-1">
              {monthlyTotal > 0 && (
                <p>Operations: ${monthlyTotal.toFixed(2)}</p>
              )}
              {inventoryExpensesTotal > 0 && (
                <p>Inventory: ${inventoryExpensesTotal.toFixed(2)}</p>
              )}
              {costExpensesLoading && <p>Loading inventory costs...</p>}
              {costExpensesError && (
                <p className="text-red-500">Error: {costExpensesError}</p>
              )}
              {!costExpensesLoading &&
                !costExpensesError &&
                inventoryExpensesTotal === 0 && (
                  <p>No inventory costs this month</p>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Recurring
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalRecurringMonthly.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated monthly recurring costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Annual Projection
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(totalRecurringMonthly * 12).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on recurring costs only
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Operational Costs
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${monthlyTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Manual cost operations only
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Expenses
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {costExpensesSummary?.totalExpenses?.grandTotal?.toFixed(2) ||
                "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Automatic inventory cost tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Expenses Summary */}
      {costExpensesSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Cost Expenses Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  $
                  {costExpensesSummary.totalExpenses.totalInventoryExpenses.toFixed(
                    2
                  )}
                </div>
                <p className="text-sm text-blue-600">Inventory Costs</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  $
                  {costExpensesSummary.totalExpenses.totalOperationalExpenses.toFixed(
                    2
                  )}
                </div>
                <p className="text-sm text-green-600">Operational Costs</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  $
                  {costExpensesSummary.totalExpenses.totalOverheadExpenses.toFixed(
                    2
                  )}
                </div>
                <p className="text-sm text-orange-600">Overhead Costs</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => window.open("/cost-expenses", "_blank")}
                >
                  View Detailed Cost Expenses
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open("/profit-margins", "_blank")}
                >
                  Analyze Profit Margins
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Operations List */}
      <CostOperationsList onEdit={handleEditCost} />

      {/* Add/Edit Cost Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? "Edit Cost Operation" : "Add New Cost Operation"}
            </DialogTitle>
          </DialogHeader>
          <CostOperationForm
            costOperation={editingCost}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
