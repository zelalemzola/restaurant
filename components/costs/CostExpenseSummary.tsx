"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Calendar,
  BarChart3,
} from "lucide-react";

interface CostExpenseSummaryData {
  summary: Array<{
    _id: string;
    totalAmount: number;
    count: number;
    avgAmount: number;
  }>;
  totalExpenses: {
    totalInventoryExpenses: number;
    totalOperationalExpenses: number;
    totalOverheadExpenses: number;
    grandTotal: number;
  };
  monthlyTrend: Array<{
    _id: {
      year: number;
      month: number;
    };
    expenses: Array<{
      category: string;
      amount: number;
      count: number;
    }>;
    monthTotal: number;
  }>;
}

interface CostExpenseSummaryProps {
  data?: CostExpenseSummaryData;
  isLoading?: boolean;
  error?: any;
  onPeriodChange?: (period: string) => void;
}

export function CostExpenseSummary({
  data,
  isLoading,
  error,
  onPeriodChange,
}: CostExpenseSummaryProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("30");

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    onPeriodChange?.(period);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "inventory":
        return "text-blue-600";
      case "operational":
        return "text-green-600";
      case "overhead":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "inventory":
        return <Package className="h-4 w-4" />;
      case "operational":
        return <TrendingUp className="h-4 w-4" />;
      case "overhead":
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getMonthName = (month: number, year: number) => {
    return new Date(year, month - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-red-600">Failed to load cost expense summary</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalExpenses = data?.totalExpenses;
  const summary = data?.summary || [];
  const monthlyTrend = data?.monthlyTrend || [];

  // Calculate trend (compare last two months if available)
  const getTrend = () => {
    if (monthlyTrend.length < 2) return null;
    const current = monthlyTrend[monthlyTrend.length - 1]?.monthTotal || 0;
    const previous = monthlyTrend[monthlyTrend.length - 2]?.monthTotal || 0;
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(change),
      isIncrease: change > 0,
    };
  };

  const trend = getTrend();

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Cost Expense Summary</h3>
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalExpenses
                ? formatCurrency(totalExpenses.grandTotal)
                : "$0.00"}
            </div>
            {trend && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {trend.isIncrease ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                )}
                {trend.percentage.toFixed(1)}% from last month
              </p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Costs
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalExpenses
                ? formatCurrency(totalExpenses.totalInventoryExpenses)
                : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Product cost expenses
            </p>
          </CardContent>
        </Card>

        {/* Operational Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalExpenses
                ? formatCurrency(totalExpenses.totalOperationalExpenses)
                : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Operational expenses
            </p>
          </CardContent>
        </Card>

        {/* Overhead Expenses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overhead</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalExpenses
                ? formatCurrency(totalExpenses.totalOverheadExpenses)
                : "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Overhead expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {summary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Expense Breakdown by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.map((item) => {
                const percentage = totalExpenses?.grandTotal
                  ? (item.totalAmount / totalExpenses.grandTotal) * 100
                  : 0;
                return (
                  <div
                    key={item._id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={getCategoryColor(item._id)}>
                        {getCategoryIcon(item._id)}
                      </div>
                      <div>
                        <p className="font-medium capitalize">{item._id}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.count} expense{item.count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {formatCurrency(item.totalAmount)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trend */}
      {monthlyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyTrend.slice(-6).map((month) => (
                <div
                  key={`${month._id.year}-${month._id.month}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">
                      {getMonthName(month._id.month, month._id.year)}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {month.expenses.map((expense) => (
                        <Badge
                          key={expense.category}
                          variant="outline"
                          className="text-xs"
                        >
                          {expense.category}: {formatCurrency(expense.amount)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {formatCurrency(month.monthTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
