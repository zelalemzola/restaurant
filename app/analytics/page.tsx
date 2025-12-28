"use client";

import { useState } from "react";
import { useAuth } from "@/lib/providers/AuthProvider";
import { DashboardHeader } from "@/components/ui/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon,
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileText,
  Percent
} from "lucide-react";
import { 
  useGetFinancialAnalyticsQuery,
  useGetInventorySalesAnalyticsQuery 
} from "@/lib/store/api";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { InteractiveChart, ChartDashboard } from '@/components/ui/interactive-charts';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { useKeyboardShortcuts, commonShortcuts, KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [period, setPeriod] = useState('daily');

  const { data: analyticsData, isLoading, error, refetch } = useGetFinancialAnalyticsQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    period
  });

  const { 
    data: inventorySalesData, 
    isLoading: isInventorySalesLoading, 
    error: inventorySalesError,
    refetch: refetchInventorySales 
  } = useGetInventorySalesAnalyticsQuery({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    period
  });

  const analytics = analyticsData?.success ? analyticsData.data : null;
  const inventorySalesAnalytics = inventorySalesData?.success ? inventorySalesData.data : null;

  // Keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    {
      ...commonShortcuts.refresh,
      action: () => {
        refetch();
        refetchInventorySales();
      },
    },
    {
      ...commonShortcuts.export,
      action: () => {
        if (analytics?.profit.byPeriod) {
          exportToCSV(analytics.profit.byPeriod, 'analytics_data');
        }
      },
    },
    {
      key: '1',
      description: 'Switch to Overview tab',
      category: 'Navigation',
      action: () => {
        const overviewTab = document.querySelector('[value="overview"]') as HTMLElement;
        overviewTab?.click();
      },
    },
    {
      key: '2', 
      description: 'Switch to Revenue tab',
      category: 'Navigation',
      action: () => {
        const revenueTab = document.querySelector('[value="revenue"]') as HTMLElement;
        revenueTab?.click();
      },
    },
    {
      key: '3',
      description: 'Switch to Costs tab', 
      category: 'Navigation',
      action: () => {
        const costsTab = document.querySelector('[value="costs"]') as HTMLElement;
        costsTab?.click();
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

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
  };

  const handleQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    setDateRange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    });
  };

  const handleMonthRange = () => {
    const now = new Date();
    setDateRange({
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd')
    });
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  if (authLoading || isLoading || isInventorySalesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || inventorySalesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader title="Financial Analytics" />
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <p>Error loading analytics data. Please try again.</p>
              <Button onClick={() => {
                refetch();
                refetchInventorySales();
              }} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <DashboardHeader title="Financial Analytics" />
        <KeyboardShortcutsHelp shortcuts={shortcuts} />
      </div>
      
      {/* Date Range and Period Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Period</Label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quick Ranges</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleQuickDateRange(7)}>
                  7 Days
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleQuickDateRange(30)}>
                  30 Days
                </Button>
                <Button variant="outline" size="sm" onClick={handleMonthRange}>
                  This Month
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics?.revenue.total || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Costs</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(analytics?.costs.total || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(analytics?.profit.total || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(analytics?.profit.total || 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(analytics?.profit.margin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(analytics?.profit.margin || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="profit-margins">Profit Margins</TabsTrigger>
          <TabsTrigger value="sales-trends">Sales Trends</TabsTrigger>
          <TabsTrigger value="popular-products">Popular Products</TabsTrigger>
          <TabsTrigger value="inventory-turnover">Inventory</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue vs Costs Chart */}
            <InteractiveChart
              data={analytics?.profit.byPeriod || []}
              config={{
                title: "Revenue vs Costs",
                description: "Comparison over time",
                type: "area",
                xAxisKey: "date",
                areas: [
                  {
                    dataKey: "revenue",
                    name: "Revenue",
                    color: "#0088FE",
                    stackId: "1"
                  },
                  {
                    dataKey: "costs",
                    name: "Costs", 
                    color: "#FF8042",
                    stackId: "2"
                  }
                ],
                formatTooltip: (value, name) => [
                  `${(value as number).toFixed(2)}`,
                  name
                ],
                formatXAxis: (value) => format(new Date(value), 'MMM dd'),
                showBrush: true
              }}
              showControls={true}
              allowFullscreen={true}
              allowExport={true}
            />

            {/* Profit Trend */}
            <InteractiveChart
              data={analytics?.profit.byPeriod || []}
              config={{
                title: "Profit Trend",
                description: "Net profit over time",
                type: "line",
                xAxisKey: "date",
                lines: [
                  {
                    dataKey: "profit",
                    name: "Profit",
                    color: "#00C49F",
                    strokeWidth: 3
                  }
                ],
                formatTooltip: (value, name) => [
                  formatCurrency(value as number),
                  name
                ],
                formatXAxis: (value) => format(new Date(value), 'MMM dd'),
                showReferenceLine: true,
                referenceValue: 0,
                referenceLabel: "Break Even"
              }}
              showControls={true}
              allowFullscreen={true}
              allowExport={true}
            />
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Period */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Revenue by Period</CardTitle>
                  <CardDescription>Revenue trends over time</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics?.revenue.byPeriod || [], 'revenue_by_period')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.revenue.byPeriod || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="amount" fill="#0088FE" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Payment Method */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Revenue by Payment Method</CardTitle>
                  <CardDescription>Payment method distribution</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics?.revenue.byPaymentMethod || [], 'revenue_by_payment_method')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(analytics?.revenue.byPaymentMethod || []).map(item => ({
                        name: item.method,
                        value: item.amount,
                        percentage: item.percentage
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(analytics?.revenue.byPaymentMethod || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Costs by Period */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Costs by Period</CardTitle>
                  <CardDescription>Cost trends over time</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics?.costs.byPeriod || [], 'costs_by_period')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.costs.byPeriod || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="amount" fill="#FF8042" name="Costs" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Costs by Category */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Costs by Category</CardTitle>
                  <CardDescription>Cost category breakdown</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(analytics?.costs.byCategory || [], 'costs_by_category')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={(analytics?.costs.byCategory || []).map(item => ({
                        name: item.category,
                        value: item.amount,
                        percentage: item.percentage
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {(analytics?.costs.byCategory || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profit Margins Tab */}
        <TabsContent value="profit-margins" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Combination Items Profit Margins</CardTitle>
                <CardDescription>Profit analysis for items sold as both stock and retail</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(analytics?.combinationItems.profitMargins || [], 'combination_items_profit_margins')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {analytics?.combinationItems.profitMargins && analytics.combinationItems.profitMargins.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.combinationItems.profitMargins}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="productName" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="totalProfit" fill="#00C49F" name="Total Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Product</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Cost Price</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Selling Price</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Margin</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Margin %</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Total Sold</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Total Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.combinationItems.profitMargins.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-medium">
                              {item.productName}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(item.costPrice)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(item.sellingPrice)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(item.margin)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              <span className={item.marginPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatPercentage(item.marginPercentage)}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {item.totalSold}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                              <span className={item.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(item.totalProfit)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No combination items found for the selected period.</p>
                  <p className="text-sm">Combination items are products that can be both used as stock and sold to customers.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Trends Tab */}
        <TabsContent value="sales-trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trends by Period */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sales Trends by Period</CardTitle>
                  <CardDescription>Sales performance over time</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(inventorySalesAnalytics?.salesTrends.byPeriod || [], 'sales_trends_by_period')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={inventorySalesAnalytics?.salesTrends.byPeriod || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'totalSales' ? formatCurrency(value as number) : value,
                        name === 'totalSales' ? 'Total Sales' : 
                        name === 'transactionCount' ? 'Transactions' : 'Avg Order Value'
                      ]} 
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalSales"
                      stroke="#0088FE"
                      strokeWidth={3}
                      name="Total Sales"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="transactionCount"
                      stroke="#00C49F"
                      strokeWidth={2}
                      name="Transaction Count"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Payment Method Distribution */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Method Analytics</CardTitle>
                  <CardDescription>Detailed payment method breakdown</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(inventorySalesAnalytics?.paymentMethodDistribution || [], 'payment_method_distribution')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {inventorySalesAnalytics?.paymentMethodDistribution && inventorySalesAnalytics.paymentMethodDistribution.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={inventorySalesAnalytics.paymentMethodDistribution.map(item => ({
                            name: item.method,
                            value: item.transactionCount,
                            percentage: item.percentage
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {inventorySalesAnalytics.paymentMethodDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Payment Method</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Transactions</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Total Amount</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Percentage</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Avg Transaction</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventorySalesAnalytics.paymentMethodDistribution.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 font-medium">
                                {item.method}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {item.transactionCount}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {formatCurrency(item.totalAmount)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {formatPercentage(item.percentage)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {formatCurrency(item.averageTransactionValue)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment method data found for the selected period.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Popular Products Tab */}
        <TabsContent value="popular-products" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Products by Quantity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Products by Quantity Sold</CardTitle>
                  <CardDescription>Most sold products by quantity</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(inventorySalesAnalytics?.popularProducts.byQuantity || [], 'popular_products_by_quantity')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {inventorySalesAnalytics?.popularProducts.byQuantity && inventorySalesAnalytics.popularProducts.byQuantity.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={inventorySalesAnalytics.popularProducts.byQuantity.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="productName" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip formatter={(value) => [value, 'Quantity Sold']} />
                        <Bar dataKey="totalQuantitySold" fill="#0088FE" name="Quantity Sold" />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Rank</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Product</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Quantity Sold</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Revenue</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Transactions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventorySalesAnalytics.popularProducts.byQuantity.slice(0, 10).map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 text-center font-bold">
                                #{item.rank}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 font-medium">
                                {item.productName}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.productType === 'stock' ? 'bg-blue-100 text-blue-800' :
                                  item.productType === 'sellable' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {item.productType}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                                {item.totalQuantitySold}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {formatCurrency(item.totalRevenue)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {item.transactionCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No product sales data found for the selected period.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Popular Products by Revenue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Top Products by Revenue</CardTitle>
                  <CardDescription>Highest revenue generating products</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(inventorySalesAnalytics?.popularProducts.byRevenue || [], 'popular_products_by_revenue')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {inventorySalesAnalytics?.popularProducts.byRevenue && inventorySalesAnalytics.popularProducts.byRevenue.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={inventorySalesAnalytics.popularProducts.byRevenue.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="productName" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                        <Bar dataKey="totalRevenue" fill="#00C49F" name="Revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Rank</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Product</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Revenue</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Quantity Sold</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Transactions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventorySalesAnalytics.popularProducts.byRevenue.slice(0, 10).map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 text-center font-bold">
                                #{item.rank}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 font-medium">
                                {item.productName}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.productType === 'stock' ? 'bg-blue-100 text-blue-800' :
                                  item.productType === 'sellable' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {item.productType}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                                {formatCurrency(item.totalRevenue)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {item.totalQuantitySold}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {item.transactionCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No product revenue data found for the selected period.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Turnover Tab */}
        <TabsContent value="inventory-turnover" className="space-y-6">
          {/* Inventory Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Turnover Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(inventorySalesAnalytics?.inventoryTurnover.summary.averageTurnoverRate || 0).toFixed(2)}x
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fast Moving Items</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {inventorySalesAnalytics?.inventoryTurnover.summary.fastMovingItems || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Slow Moving Items</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {inventorySalesAnalytics?.inventoryTurnover.summary.slowMovingItems || 0}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventorySalesAnalytics?.inventoryTurnover.summary.totalProducts || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Turnover Analysis */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inventory Turnover Analysis</CardTitle>
                  <CardDescription>Product turnover rates and stock efficiency</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(inventorySalesAnalytics?.inventoryTurnover.byProduct || [], 'inventory_turnover')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {inventorySalesAnalytics?.inventoryTurnover.byProduct && inventorySalesAnalytics.inventoryTurnover.byProduct.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={inventorySalesAnalytics.inventoryTurnover.byProduct.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="productName" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis />
                        <Tooltip formatter={(value) => [(value as number).toFixed(2), 'Turnover Rate']} />
                        <Bar dataKey="turnoverRate" fill="#FFBB28" name="Turnover Rate" />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Product</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Current Stock</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Total Usage</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Turnover Rate</th>
                            <th className="border border-gray-300 px-4 py-2 text-right">Days to Turn</th>
                            <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventorySalesAnalytics.inventoryTurnover.byProduct.slice(0, 15).map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 font-medium">
                                {item.productName}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.productType === 'stock' ? 'bg-blue-100 text-blue-800' :
                                  item.productType === 'sellable' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {item.productType}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {item.currentStock}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {item.totalUsage}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                                {item.turnoverRate.toFixed(2)}x
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-right">
                                {item.daysToTurnover === 999 ? 'N/A' : Math.round(item.daysToTurnover)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  item.stockStatus === 'low-stock' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                }`}>
                                  {item.stockStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No inventory turnover data found for the selected period.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Stock Usage Patterns */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Stock Usage Patterns</CardTitle>
                  <CardDescription>Usage trends and patterns over time</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(inventorySalesAnalytics?.stockUsagePatterns.byPeriod || [], 'stock_usage_patterns')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {inventorySalesAnalytics?.stockUsagePatterns.byPeriod && inventorySalesAnalytics.stockUsagePatterns.byPeriod.length > 0 ? (
                  <div className="space-y-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={inventorySalesAnalytics.stockUsagePatterns.byPeriod}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="totalUsage"
                          stroke="#FF8042"
                          strokeWidth={3}
                          name="Total Usage"
                        />
                        <Line
                          type="monotone"
                          dataKey="usageTransactions"
                          stroke="#8884D8"
                          strokeWidth={2}
                          name="Usage Transactions"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    
                    <div className="space-y-2">
                      <h4 className="font-semibold">Most Used Products by Period:</h4>
                      {inventorySalesAnalytics.stockUsagePatterns.byPeriod.slice(-5).map((period, index) => (
                        <div key={index} className="border rounded p-3 bg-gray-50">
                          <div className="font-medium">{period.date}</div>
                          <div className="text-sm text-gray-600">
                            Total Usage: {period.totalUsage} | Transactions: {period.usageTransactions}
                          </div>
                          <div className="mt-2">
                            {period.topUsedProducts.slice(0, 3).map((product, pIndex) => (
                              <span key={pIndex} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                                {product.productName}: {product.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No stock usage pattern data found for the selected period.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
  