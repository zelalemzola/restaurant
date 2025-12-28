'use client';

import { useState, useMemo } from 'react';
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
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  ScatterChart,
  Scatter,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Maximize2,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

interface ChartData {
  [key: string]: any;
}

interface ChartConfig {
  title: string;
  description?: string;
  type: 'line' | 'area' | 'bar' | 'pie' | 'scatter';
  dataKey?: string;
  xAxisKey?: string;
  yAxisKey?: string;
  lines?: Array<{
    dataKey: string;
    name: string;
    color: string;
    strokeWidth?: number;
  }>;
  bars?: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  areas?: Array<{
    dataKey: string;
    name: string;
    color: string;
    stackId?: string;
  }>;
  showBrush?: boolean;
  showReferenceLine?: boolean;
  referenceValue?: number;
  referenceLabel?: string;
  formatTooltip?: (value: any, name: string) => [string, string];
  formatXAxis?: (value: any) => string;
  formatYAxis?: (value: any) => string;
}

interface InteractiveChartProps {
  data: ChartData[];
  config: ChartConfig;
  height?: number;
  className?: string;
  onDataPointClick?: (data: any) => void;
  showControls?: boolean;
  allowFullscreen?: boolean;
  allowExport?: boolean;
}

export function InteractiveChart({
  data,
  config,
  height = 300,
  className = "",
  onDataPointClick,
  showControls = true,
  allowFullscreen = false,
  allowExport = false,
}: InteractiveChartProps) {
  const [chartType, setChartType] = useState(config.type);
  const [selectedMetric, setSelectedMetric] = useState(config.dataKey || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);

  // Get available metrics from data
  const availableMetrics = useMemo(() => {
    if (data.length === 0) return [];
    const firstItem = data[0];
    return Object.keys(firstItem).filter(key => 
      typeof firstItem[key] === 'number' && key !== config.xAxisKey
    );
  }, [data, config.xAxisKey]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const defaultTooltipFormatter = (value: any, name?: string) => {
    if (typeof value === 'number') {
      if (name && name.toLowerCase().includes('price') || name && name.toLowerCase().includes('revenue') || name && name.toLowerCase().includes('cost')) {
        return [formatCurrency(value), name || ''];
      }
      if (name && (name.toLowerCase().includes('percentage') || name.toLowerCase().includes('margin'))) {
        return [formatPercentage(value), name || ''];
      }
      return [formatNumber(value), name || ''];
    }
    return [value, name || ''];
  };

  const tooltipFormatter = config.formatTooltip || defaultTooltipFormatter;

  const handleDataPointClick = (data: any) => {
    if (onDataPointClick) {
      onDataPointClick(data);
    }
  };

  const exportChart = () => {
    // Simple export functionality - in a real app, you might use a library like html2canvas
    const chartData = JSON.stringify(data, null, 2);
    const blob = new Blob([chartData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.title.replace(/\s+/g, '_').toLowerCase()}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    const commonProps = {
      data: data,
      onClick: handleDataPointClick,
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xAxisKey} 
              tickFormatter={config.formatXAxis}
            />
            <YAxis tickFormatter={config.formatYAxis} />
            <Tooltip formatter={tooltipFormatter as any} />
            <Legend />
            {config.lines?.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 2}
                name={line.name}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )) || (
              <Line
                type="monotone"
                dataKey={(selectedMetric || config.dataKey) as string}
                stroke={COLORS[0]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
            {config.showReferenceLine && config.referenceValue && (
              <ReferenceLine 
                y={config.referenceValue} 
                stroke="red" 
                strokeDasharray="5 5"
                label={config.referenceLabel}
              />
            )}
            {config.showBrush && (
              <Brush 
                dataKey={config.xAxisKey} 
                height={30}
                stroke={COLORS[0]}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xAxisKey} 
              tickFormatter={config.formatXAxis}
            />
            <YAxis tickFormatter={config.formatYAxis} />
            <Tooltip formatter={tooltipFormatter as any} />
            <Legend />
            {config.areas?.map((area, index) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                stackId={area.stackId}
                stroke={area.color}
                fill={area.color}
                fillOpacity={0.6}
                name={area.name}
              />
            )) || (
              <Area
                type="monotone"
                dataKey={(selectedMetric || config.dataKey) as string}
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.6}
              />
            )}
            {config.showBrush && (
              <Brush 
                dataKey={config.xAxisKey} 
                height={30}
                stroke={COLORS[0]}
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xAxisKey} 
              tickFormatter={config.formatXAxis}
            />
            <YAxis tickFormatter={config.formatYAxis} />
            <Tooltip formatter={tooltipFormatter as any} />
            <Legend />
            {config.bars?.map((bar, index) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                fill={bar.color}
                name={bar.name}
                radius={[2, 2, 0, 0]}
              />
            )) || (
              <Bar
                dataKey={(selectedMetric || config.dataKey) as string}
                fill={COLORS[0]}
                radius={[2, 2, 0, 0]}
              />
            )}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={(selectedMetric || config.dataKey) as string}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={tooltipFormatter as any} />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey={config.xAxisKey} 
              tickFormatter={config.formatXAxis}
            />
            <YAxis 
              dataKey={config.yAxisKey}
              tickFormatter={config.formatYAxis} 
            />
            <Tooltip formatter={tooltipFormatter as any} />
            <Scatter 
              dataKey={(selectedMetric || config.dataKey) as string} 
              fill={COLORS[0]}
            />
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  const getTrendIndicator = () => {
    if (data.length < 2) return null;
    
    const firstValue = data[0][selectedMetric || config.dataKey || ''];
    const lastValue = data[data.length - 1][selectedMetric || config.dataKey || ''];
    
    if (typeof firstValue !== 'number' || typeof lastValue !== 'number') return null;
    
    const change = ((lastValue - firstValue) / firstValue) * 100;
    const isPositive = change > 0;
    
    return (
      <div className="flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {config.title}
              {getTrendIndicator()}
            </CardTitle>
            {config.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {config.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {allowExport && (
              <Button variant="outline" size="sm" onClick={exportChart}>
                <Download className="h-4 w-4" />
              </Button>
            )}
            {allowFullscreen && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {showControls && (
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant={chartType === 'line' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('line')}
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('bar')}
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('area')}
              >
                <Activity className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartType('pie')}
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
            </div>
            
            {availableMetrics.length > 1 && (
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric} value={metric}>
                      {metric.charAt(0).toUpperCase() + metric.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={isFullscreen ? 600 : height}>
          {renderChart()}
        </ResponsiveContainer>
        
        {data.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            Data points: {data.length} | 
            Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Multi-chart dashboard component
interface ChartDashboardProps {
  charts: Array<{
    id: string;
    data: ChartData[];
    config: ChartConfig;
    span?: number; // Grid span (1-2)
  }>;
  className?: string;
}

export function ChartDashboard({ charts, className = "" }: ChartDashboardProps) {
  const [selectedChart, setSelectedChart] = useState<string | null>(null);

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart) => (
          <div
            key={chart.id}
            className={chart.span === 2 ? 'lg:col-span-2' : ''}
          >
            <InteractiveChart
              data={chart.data}
              config={chart.config}
              showControls={true}
              allowFullscreen={true}
              allowExport={true}
              onDataPointClick={(data) => {
                console.log('Chart data point clicked:', data);
                setSelectedChart(chart.id);
              }}
            />
          </div>
        ))}
      </div>
      
      {selectedChart && (
        <Card>
          <CardHeader>
            <CardTitle>Chart Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Selected chart: {charts.find(c => c.id === selectedChart)?.config.title}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedChart(null)}
              className="mt-2"
            >
              Close Details
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}