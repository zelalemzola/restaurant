"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, DollarSign, TrendingUp, Calendar, Receipt } from "lucide-react";
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
            <div className="text-2xl font-bold">${monthlyTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {currentMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
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
              Total Operations
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCosts.length}</div>
            <p className="text-xs text-muted-foreground">
              Cost entries this month
            </p>
          </CardContent>
        </Card>
      </div>

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
