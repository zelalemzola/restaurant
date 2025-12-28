'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useStockMonitoring } from '@/hooks/use-stock-monitoring';
import { AlertTriangle, CheckCircle, XCircle, Clock, Trash2, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StockAlertsPanelProps {
  className?: string;
  maxAlerts?: number;
  showControls?: boolean;
}

export function StockAlertsPanel({ 
  className, 
  maxAlerts = 10,
  showControls = true 
}: StockAlertsPanelProps) {
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  
  const { 
    stockAlerts, 
    clearAlerts, 
    isMonitoring 
  } = useStockMonitoring({
    enabled: monitoringEnabled,
    showToastAlerts: true,
  });

  const recentAlerts = stockAlerts.slice(0, maxAlerts);

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'out-of-stock':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'low-stock':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'restocked':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertBadge = (alertType: string) => {
    switch (alertType) {
      case 'out-of-stock':
        return (
          <Badge variant="destructive" className="text-xs">
            Out of Stock
          </Badge>
        );
      case 'low-stock':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
            Low Stock
          </Badge>
        );
      case 'restocked':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
            Restocked
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const toggleMonitoring = () => {
    setMonitoringEnabled(!monitoringEnabled);
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Stock Alerts
              {isMonitoring && (
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </CardTitle>
            <CardDescription>
              Real-time inventory level notifications
            </CardDescription>
          </div>
          {showControls && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMonitoring}
                className="flex items-center gap-1"
              >
                {monitoringEnabled ? (
                  <>
                    <BellOff className="h-3 w-3" />
                    Disable
                  </>
                ) : (
                  <>
                    <Bell className="h-3 w-3" />
                    Enable
                  </>
                )}
              </Button>
              {stockAlerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAlerts}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentAlerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent stock alerts</p>
            <p className="text-xs mt-1">
              {monitoringEnabled ? 'Monitoring is active' : 'Monitoring is disabled'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentAlerts.map((alert, index) => (
              <div key={`${alert.productId}-${alert.timestamp.getTime()}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.alertType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-sm truncate">
                        {alert.productName}
                      </p>
                      {getAlertBadge(alert.alertType)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>
                        Current: {alert.currentQuantity} {alert.metric}
                        {alert.minStockLevel > 0 && (
                          <span className="ml-2">
                            Min: {alert.minStockLevel} {alert.metric}
                          </span>
                        )}
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(alert.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
                {index < recentAlerts.length - 1 && (
                  <Separator className="mt-3" />
                )}
              </div>
            ))}
            
            {stockAlerts.length > maxAlerts && (
              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  +{stockAlerts.length - maxAlerts} more alerts
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}