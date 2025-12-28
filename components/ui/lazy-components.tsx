// Lazy-loaded components for better performance
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-6 w-6 animate-spin" />
  </div>
);

// Lazy load heavy chart components
export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Lazy load interactive charts
export const LazyInteractiveCharts = dynamic(
  () => import('@/components/ui/interactive-charts').then(mod => ({ default: mod.InteractiveChart })),
  {
    loading: () => <LoadingSpinner />,
    ssr: false
  }
);

// Lazy load complex forms
export const LazyProductForm = dynamic(
  () => import('@/components/inventory/ProductForm').then(mod => ({ default: mod.ProductForm })),
  {
    loading: () => <LoadingSpinner />
  }
);

// Lazy load modals and dialogs
export const LazyStockAdjustmentDialog = dynamic(
  () => import('@/components/inventory/StockAdjustmentDialog').then(mod => ({ default: mod.StockAdjustmentDialog })),
  {
    loading: () => <LoadingSpinner />
  }
);

export const LazyStockUsageDialog = dynamic(
  () => import('@/components/inventory/StockUsageDialog').then(mod => ({ default: mod.StockUsageDialog })),
  {
    loading: () => <LoadingSpinner />
  }
);