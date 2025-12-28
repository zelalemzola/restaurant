"use client";

import { useAuth } from "@/lib/providers/AuthProvider";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { MetricCard } from "@/components/ui/metric-card";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { LoadingPage, LoadingCard } from "@/components/ui/loading";
import { ErrorBoundary, ErrorFallback } from "@/components/ui/error-boundary";
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
} from "lucide-react";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
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
    <ErrorBoundary fallback={ErrorFallback}>
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

          {/* Dashboard Content Grid */}
          <ResponsiveGrid cols={{ default: 1, xl: 3 }} gap="lg">
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

            {/* Quick Actions - Takes 1 column */}
            <div className="xl:col-span-1">
              <QuickActions />
            </div>
          </ResponsiveGrid>

          {/* Error State */}
          {error && (
            <div className="mt-6">
              <ErrorFallback
                error={new Error("Failed to load dashboard data")}
                resetError={() => window.location.reload()}
                title="Dashboard Error"
                compact={false}
              />
            </div>
          )}
        </ResponsiveContainer>
      </AppLayout>
    </ErrorBoundary>
  );
}
