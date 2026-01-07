"use client";

import { useAuth } from "@/lib/providers/AuthProvider";
import { useRealTimeUpdates } from "@/lib/hooks/useRealTimeUpdates";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { MetricCard } from "@/components/ui/metric-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LowStockSection } from "@/components/dashboard/LowStockSection";
import { LoadingPage, LoadingCard } from "@/components/ui/loading";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  ResponsiveContainer,
  ResponsiveGrid,
} from "@/components/ui/responsive-container";
import { useGetDashboardDataQuery } from "@/lib/store/api";
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Package,
  Bell,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  // Enable real-time updates for all dashboard data
  useRealTimeUpdates({
    enableProducts: true,
    enableInventory: true,
    enableSales: true,
    enableCosts: true,
    enableNotifications: true,
  });

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error,
  } = useGetDashboardDataQuery();

  if (authLoading) {
    return <LoadingPage text="Loading dashboard..." />;
  }

  const dashboard = dashboardData?.success ? dashboardData.data : null;

  return (
    <ErrorBoundary>
      <AppLayout>
        <ResponsiveContainer size="full" padding="md">
          <DashboardHeader
            title="Restaurant ERP Dashboard"
            description={`Welcome back, ${
              user?.firstName || user?.name || user?.email
            }!`}
          />

          {/* Key Performance Indicators */}
          <ResponsiveGrid
            cols={{ default: 1, sm: 2, lg: 4 }}
            gap="md"
            className="mb-6 lg:mb-8"
          >
            <MetricCard
              title="Today's Sales"
              value={
                dashboardLoading
                  ? "..."
                  : `$${dashboard?.dailySales.amount.toFixed(2) || "0.00"}`
              }
              subtitle={
                dashboardLoading
                  ? "Loading..."
                  : `${
                      dashboard?.dailySales.transactionCount || 0
                    } transactions`
              }
              icon={<DollarSign className="h-4 w-4" />}
              variant="success"
            />

            <MetricCard
              title="Weekly Sales"
              value={
                dashboardLoading
                  ? "..."
                  : `$${dashboard?.weeklySales.amount.toFixed(2) || "0.00"}`
              }
              subtitle={
                dashboardLoading
                  ? "Loading..."
                  : `${
                      dashboard?.weeklySales.transactionCount || 0
                    } transactions`
              }
              icon={<TrendingUp className="h-4 w-4" />}
            />

            <MetricCard
              title="Low Stock Items"
              value={dashboardLoading ? "..." : dashboard?.lowStockCount || 0}
              subtitle="Items below minimum level"
              icon={<AlertTriangle className="h-4 w-4" />}
              variant={
                dashboard?.lowStockCount && dashboard.lowStockCount > 0
                  ? "warning"
                  : "default"
              }
            />

            <MetricCard
              title="Total Products"
              value={dashboardLoading ? "..." : dashboard?.totalProducts || 0}
              subtitle="Items in inventory"
              icon={<Package className="h-4 w-4" />}
            />
          </ResponsiveGrid>

          {/* Secondary Metrics */}
          <ResponsiveGrid
            cols={{ default: 1, sm: 2, lg: 4 }}
            gap="md"
            className="mb-6 lg:mb-8"
          >
            <MetricCard
              title="Unread Notifications"
              value={
                dashboardLoading ? "..." : dashboard?.unreadNotifications || 0
              }
              subtitle="Pending alerts"
              icon={<Bell className="h-4 w-4" />}
              variant={
                dashboard?.unreadNotifications &&
                dashboard.unreadNotifications > 0
                  ? "destructive"
                  : "default"
              }
            />

            <MetricCard
              title="Avg. Transaction"
              value={
                dashboardLoading
                  ? "..."
                  : dashboard?.dailySales.transactionCount &&
                    dashboard.dailySales.transactionCount > 0
                  ? `$${(
                      dashboard.dailySales.amount /
                      dashboard.dailySales.transactionCount
                    ).toFixed(2)}`
                  : "$0.00"
              }
              subtitle="Today's average"
              icon={<ShoppingCart className="h-4 w-4" />}
            />

            <MetricCard
              title="Weekly Avg."
              value={
                dashboardLoading
                  ? "..."
                  : dashboard?.weeklySales.transactionCount &&
                    dashboard.weeklySales.transactionCount > 0
                  ? `$${(
                      dashboard.weeklySales.amount /
                      dashboard.weeklySales.transactionCount
                    ).toFixed(2)}`
                  : "$0.00"
              }
              subtitle="This week's average"
              icon={<TrendingUp className="h-4 w-4" />}
            />

            <MetricCard
              title="Daily vs Weekly"
              value={
                dashboardLoading
                  ? "..."
                  : dashboard?.weeklySales.amount &&
                    dashboard.weeklySales.amount > 0
                  ? `${(
                      (dashboard.dailySales.amount /
                        (dashboard.weeklySales.amount / 7)) *
                      100
                    ).toFixed(0)}%`
                  : "0%"
              }
              subtitle="Today vs daily avg"
              icon={<TrendingUp className="h-4 w-4" />}
            />
          </ResponsiveGrid>

          {/* Cost Expenses Summary */}
          {(dashboard as any)?.costExpenses &&
            (dashboard as any).costExpenses.total > 0 && (
              <Card className="mb-6 lg:mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Cost Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        $
                        {((dashboard as any)?.costExpenses?.total || 0).toFixed(
                          2
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Total Expenses
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        $
                        {(
                          (dashboard as any)?.costExpenses?.inventory || 0
                        ).toFixed(2)}
                      </div>
                      <p className="text-sm text-blue-600">Inventory</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        $
                        {(
                          (dashboard as any)?.costExpenses?.operational || 0
                        ).toFixed(2)}
                      </div>
                      <p className="text-sm text-green-600">Operational</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        $
                        {(
                          (dashboard as any)?.costExpenses?.overhead || 0
                        ).toFixed(2)}
                      </div>
                      <p className="text-sm text-orange-600">Overhead</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Dashboard Content Grid */}
          <ResponsiveGrid cols={{ default: 1, xl: 3 }} gap="lg">
            {/* Low Stock Section - Takes full width on smaller screens, 1 column on xl */}
            <div className="xl:col-span-1">
              <LowStockSection maxItems={5} />
            </div>

            {/* Recent Transactions - Takes 2 columns on xl screens */}
            <div className="xl:col-span-2">
              {dashboardLoading ? (
                <LoadingCard text="Loading recent transactions..." />
              ) : (
                <RecentTransactions
                  transactions={dashboard?.recentTransactions || []}
                  isLoading={dashboardLoading}
                />
              )}
            </div>
          </ResponsiveGrid>

          {/* Quick Actions Section */}
          <div className="mt-6">
            <QuickActions />
          </div>

          {/* Error State */}
          {error && (
            <div className="mt-6">
              <div className="p-4 border border-red-200 rounded-md bg-red-50">
                <p className="text-red-800">Failed to load dashboard data</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
        </ResponsiveContainer>
      </AppLayout>
    </ErrorBoundary>
  );
}
