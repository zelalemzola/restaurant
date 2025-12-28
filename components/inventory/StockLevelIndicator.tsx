'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockLevelIndicatorProps {
  currentQuantity: number;
  minStockLevel: number;
  metric: string;
  productName?: string;
  showProgress?: boolean;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StockLevelIndicator({
  currentQuantity,
  minStockLevel,
  metric,
  productName,
  showProgress = true,
  showBadge = true,
  size = 'md',
  className,
}: StockLevelIndicatorProps) {
  const isOutOfStock = currentQuantity === 0;
  const isLowStock = currentQuantity <= minStockLevel && currentQuantity > 0;
  const isWellStocked = currentQuantity > minStockLevel * 1.5;
  const isInStock = !isOutOfStock && !isLowStock;

  // Calculate percentage for progress bar (based on 2x min level as optimal)
  const optimalLevel = minStockLevel * 2;
  const percentage = optimalLevel > 0 ? Math.min((currentQuantity / optimalLevel) * 100, 100) : 100;

  const getStatusInfo = () => {
    if (isOutOfStock) {
      return {
        status: 'Out of Stock',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        badgeVariant: 'destructive' as const,
        progressColor: 'bg-red-500',
      };
    } else if (isLowStock) {
      return {
        status: 'Low Stock',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: AlertTriangle,
        badgeVariant: 'secondary' as const,
        progressColor: 'bg-yellow-500',
      };
    } else if (isWellStocked) {
      return {
        status: 'Well Stocked',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: TrendingUp,
        badgeVariant: 'default' as const,
        progressColor: 'bg-green-500',
      };
    } else {
      return {
        status: 'In Stock',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircle,
        badgeVariant: 'default' as const,
        progressColor: 'bg-green-500',
      };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const sizeClasses = {
    sm: {
      container: 'p-2',
      text: 'text-xs',
      icon: 'h-3 w-3',
      badge: 'text-xs px-1.5 py-0.5',
    },
    md: {
      container: 'p-3',
      text: 'text-sm',
      icon: 'h-4 w-4',
      badge: 'text-xs px-2 py-1',
    },
    lg: {
      container: 'p-4',
      text: 'text-base',
      icon: 'h-5 w-5',
      badge: 'text-sm px-3 py-1.5',
    },
  };

  const currentSizeClasses = sizeClasses[size];

  return (
    <div className={cn(
      'rounded-lg border transition-all duration-200',
      statusInfo.bgColor,
      statusInfo.borderColor,
      currentSizeClasses.container,
      className
    )}>
      <div className="space-y-2">
        {/* Header with product name and status */}
        <div className="flex items-center justify-between">
          {productName && (
            <h4 className={cn('font-medium', currentSizeClasses.text)}>
              {productName}
            </h4>
          )}
          {showBadge && (
            <Badge 
              variant={statusInfo.badgeVariant}
              className={cn(
                'flex items-center gap-1',
                currentSizeClasses.badge,
                statusInfo.color
              )}
            >
              <StatusIcon className={currentSizeClasses.icon} />
              {statusInfo.status}
            </Badge>
          )}
        </div>

        {/* Stock quantities */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className={cn('text-muted-foreground', currentSizeClasses.text)}>
              Current:
            </span>
            <span className={cn(
              'font-semibold',
              currentSizeClasses.text,
              isLowStock ? 'text-red-600' : isWellStocked ? 'text-green-600' : ''
            )}>
              {currentQuantity} {metric}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className={cn('text-muted-foreground', currentSizeClasses.text)}>
              Min Level:
            </span>
            <span className={cn('font-medium', currentSizeClasses.text)}>
              {minStockLevel} {metric}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  statusInfo.progressColor
                )}
                style={{ width: `${Math.max(percentage, 2)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className={cn('text-muted-foreground', 'text-xs')}>
                {minStockLevel > 0 
                  ? `${Math.round((currentQuantity / minStockLevel) * 100)}% of min level`
                  : 'No min level set'
                }
              </span>
              {isWellStocked && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Optimal
                </span>
              )}
              {isLowStock && (
                <span className="text-xs text-yellow-600 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Reorder Soon
                </span>
              )}
            </div>
          </div>
        )}

        {/* Additional info for critical states */}
        {isOutOfStock && (
          <div className="text-xs text-red-600 font-medium">
            ⚠️ Immediate restocking required
          </div>
        )}
        {isLowStock && (
          <div className="text-xs text-yellow-600">
            📦 Consider reordering {Math.max(minStockLevel * 2 - currentQuantity, 0).toFixed(1)} {metric}
          </div>
        )}
      </div>
    </div>
  );
}