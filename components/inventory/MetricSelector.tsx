'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Common metrics organized by category
const metricCategories = {
  Weight: ['kg', 'g', 'lbs', 'oz'],
  Volume: ['liters', 'ml', 'gallons', 'cups'],
  Count: ['pieces', 'units', 'items'],
  Packaging: ['boxes', 'bags', 'bottles', 'cans', 'packs'],
  Length: ['meters', 'cm', 'inches', 'feet'],
  'Food Service': ['servings', 'portions', 'plates', 'bowls'],
} as const;

interface MetricSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function MetricSelector({
  value,
  onChange,
  error,
  disabled = false,
  placeholder = 'Select or enter metric...',
}: MetricSelectorProps) {
  const [customMetric, setCustomMetric] = useState('');
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customError, setCustomError] = useState('');

  // Get all metrics as a flat array
  const allMetrics = Object.values(metricCategories).flat();

  // Check if current value is a custom metric
  const isCustomMetric = value && !allMetrics.includes(value as any);

  const validateCustomMetric = (metric: string): string | null => {
    const trimmed = metric.trim();
    
    if (!trimmed) {
      return 'Metric cannot be empty';
    }
    
    if (trimmed.length > 20) {
      return 'Metric must be 20 characters or less';
    }
    
    if (!/^[a-zA-Z0-9\s\-_\/]+$/.test(trimmed)) {
      return 'Metric can only contain letters, numbers, spaces, hyphens, underscores, and forward slashes';
    }
    
    if (allMetrics.includes(trimmed as any)) {
      return 'This metric already exists in the predefined list';
    }
    
    return null;
  };

  const handleAddCustomMetric = () => {
    const validationError = validateCustomMetric(customMetric);
    
    if (validationError) {
      setCustomError(validationError);
      return;
    }
    
    const trimmed = customMetric.trim();
    onChange(trimmed);
    setShowCustomDialog(false);
    setCustomMetric('');
    setCustomError('');
  };

  const handleCustomMetricChange = (value: string) => {
    setCustomMetric(value);
    setCustomError('');
  };

  return (
    <div className="space-y-2">
      <Label>Unit of Measurement *</Label>
      <div className="flex gap-2">
        <Select
          value={value}
          onValueChange={(selectedValue) => {
            if (selectedValue === 'custom') {
              setShowCustomDialog(true);
            } else {
              onChange(selectedValue);
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger className={cn(error && 'border-red-500')}>
            <SelectValue placeholder={placeholder}>
              <div className="flex items-center gap-2">
                {value}
                {isCustomMetric && (
                  <Badge variant="secondary" className="text-xs">
                    Custom
                  </Badge>
                )}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(metricCategories).map(([category, metrics]) => (
              <div key={category}>
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  {category}
                </div>
                {metrics.map((metric) => (
                  <SelectItem key={metric} value={metric}>
                    {metric}
                  </SelectItem>
                ))}
              </div>
            ))}
            <div className="border-t mt-1 pt-1">
              <SelectItem value="custom" className="text-blue-600">
                <div className="flex items-center gap-2">
                  <Plus className="h-3 w-3" />
                  Add custom metric...
                </div>
              </SelectItem>
            </div>
          </SelectContent>
        </Select>
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      
      {value && (
        <div className="text-xs text-muted-foreground">
          Selected: <span className="font-medium">{value}</span>
          {isCustomMetric && (
            <span className="ml-1 text-blue-600">(custom)</span>
          )}
        </div>
      )}

      {/* Custom Metric Dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Metric</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customMetric">Custom Metric</Label>
              <Input
                id="customMetric"
                value={customMetric}
                onChange={(e) => handleCustomMetricChange(e.target.value)}
                placeholder="Enter custom metric (e.g., bunches, trays)"
                maxLength={20}
                className={cn(customError && 'border-red-500')}
              />
              {customError && (
                <p className="text-sm text-red-600 mt-1">{customError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Letters, numbers, spaces, hyphens, underscores, and slashes only (max 20 characters)
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCustomDialog(false);
                  setCustomMetric('');
                  setCustomError('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddCustomMetric}
                disabled={!customMetric.trim()}
              >
                Add Metric
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}