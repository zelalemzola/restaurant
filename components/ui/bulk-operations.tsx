'use client';

import { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Edit, 
  Trash2, 
  Archive, 
  Tag, 
  Move,
  MoreHorizontal,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';

export interface BulkOperation {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: (selectedIds: string[], data?: any) => Promise<void>;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
  requiresData?: boolean;
  dataFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea';
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
  variant?: 'default' | 'destructive' | 'secondary';
}

interface BulkOperationsProps {
  items: Array<{ _id: string; [key: string]: any }>;
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  operations: BulkOperation[];
  className?: string;
}

export function BulkOperations({
  items,
  selectedIds,
  onSelectionChange,
  operations,
  className = "",
}: BulkOperationsProps) {
  const [isOperationDialogOpen, setIsOperationDialogOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
  const [operationData, setOperationData] = useState<Record<string, any>>({});
  const [isExecuting, setIsExecuting] = useState(false);

  const isAllSelected = items.length > 0 && selectedIds.length === items.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < items.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(items.map(item => item._id));
    }
  };

  const handleOperationClick = (operation: BulkOperation) => {
    if (selectedIds.length === 0) {
      alert('Please select at least one item.');
      return;
    }

    setCurrentOperation(operation);
    setOperationData({});

    if (operation.requiresData) {
      setIsOperationDialogOpen(true);
    } else if (operation.requiresConfirmation) {
      const message = operation.confirmationMessage || 
        `Are you sure you want to ${operation.label.toLowerCase()} ${selectedIds.length} item(s)?`;
      if (confirm(message)) {
        executeOperation(operation);
      }
    } else {
      executeOperation(operation);
    }
  };

  const executeOperation = async (operation: BulkOperation, data?: any) => {
    setIsExecuting(true);
    try {
      await operation.action(selectedIds, data);
      onSelectionChange([]); // Clear selection after operation
      setIsOperationDialogOpen(false);
    } catch (error) {
      console.error('Bulk operation failed:', error);
      alert('Operation failed. Please try again.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOperationSubmit = () => {
    if (currentOperation) {
      // Validate required fields
      const requiredFields = currentOperation.dataFields?.filter(field => field.required) || [];
      const missingFields = requiredFields.filter(field => !operationData[field.key]);
      
      if (missingFields.length > 0) {
        alert(`Please fill in required fields: ${missingFields.map(f => f.label).join(', ')}`);
        return;
      }

      executeOperation(currentOperation, operationData);
    }
  };

  const renderDataField = (field: any) => {
    switch (field.type) {
      case 'select':
        return (
          <Select
            value={operationData[field.key] || ''}
            onValueChange={(value) => setOperationData(prev => ({ ...prev, [field.key]: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: any) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={operationData[field.key] || ''}
            onChange={(e) => setOperationData(prev => ({ ...prev, [field.key]: e.target.value }))}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={operationData[field.key] || ''}
            onChange={(e) => setOperationData(prev => ({ ...prev, [field.key]: e.target.value }))}
          />
        );
      default:
        return (
          <Input
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={operationData[field.key] || ''}
            onChange={(e) => setOperationData(prev => ({ ...prev, [field.key]: e.target.value }))}
          />
        );
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="p-1"
              >
                {isAllSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : isPartiallySelected ? (
                  <div className="h-4 w-4 border-2 border-primary bg-primary/20 rounded-sm flex items-center justify-center">
                    <div className="h-2 w-2 bg-primary rounded-sm" />
                  </div>
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {selectedIds.length > 0 ? (
                  <>
                    <Badge variant="secondary" className="mr-2">
                      {selectedIds.length}
                    </Badge>
                    selected
                  </>
                ) : (
                  'Select items for bulk operations'
                )}
              </span>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                {operations.slice(0, 3).map((operation) => (
                  <Button
                    key={operation.id}
                    variant={operation.variant || "outline"}
                    size="sm"
                    onClick={() => handleOperationClick(operation)}
                    disabled={isExecuting}
                    className="flex items-center gap-2"
                  >
                    {isExecuting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      operation.icon
                    )}
                    {operation.label}
                  </Button>
                ))}
                
                {operations.length > 3 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {operations.slice(3).map((operation) => (
                        <DropdownMenuItem
                          key={operation.id}
                          onClick={() => handleOperationClick(operation)}
                          disabled={isExecuting}
                        >
                          <div className="flex items-center gap-2">
                            {operation.icon}
                            {operation.label}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Operation Data Dialog */}
      <Dialog open={isOperationDialogOpen} onOpenChange={setIsOperationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {currentOperation?.icon}
              {currentOperation?.label}
            </DialogTitle>
          </DialogHeader>
          
          {currentOperation && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                This operation will affect {selectedIds.length} selected item(s).
              </div>
              
              {currentOperation.dataFields?.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {renderDataField(field)}
                </div>
              ))}
              
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleOperationSubmit}
                  disabled={isExecuting}
                  className="flex-1"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {currentOperation.icon}
                      Execute
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsOperationDialogOpen(false)}
                  disabled={isExecuting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Common bulk operations for inventory management
export const inventoryBulkOperations: BulkOperation[] = [
  {
    id: 'bulk-edit-group',
    label: 'Change Group',
    icon: <Move className="h-4 w-4" />,
    action: async (selectedIds, data) => {
      // Implementation would call API to update product groups
      console.log('Bulk update group:', selectedIds, data);
    },
    requiresData: true,
    dataFields: [
      {
        key: 'groupId',
        label: 'New Product Group',
        type: 'select',
        required: true,
        options: [], // Would be populated with actual product groups
      }
    ]
  },
  {
    id: 'bulk-adjust-stock',
    label: 'Adjust Stock',
    icon: <Edit className="h-4 w-4" />,
    action: async (selectedIds, data) => {
      console.log('Bulk adjust stock:', selectedIds, data);
    },
    requiresData: true,
    dataFields: [
      {
        key: 'adjustment',
        label: 'Stock Adjustment',
        type: 'number',
        required: true,
      },
      {
        key: 'reason',
        label: 'Reason',
        type: 'textarea',
        required: true,
      }
    ]
  },
  {
    id: 'bulk-update-prices',
    label: 'Update Prices',
    icon: <Tag className="h-4 w-4" />,
    action: async (selectedIds, data) => {
      console.log('Bulk update prices:', selectedIds, data);
    },
    requiresData: true,
    dataFields: [
      {
        key: 'priceType',
        label: 'Price Type',
        type: 'select',
        required: true,
        options: [
          { value: 'cost', label: 'Cost Price' },
          { value: 'selling', label: 'Selling Price' },
          { value: 'both', label: 'Both Prices' }
        ]
      },
      {
        key: 'adjustmentType',
        label: 'Adjustment Type',
        type: 'select',
        required: true,
        options: [
          { value: 'percentage', label: 'Percentage' },
          { value: 'fixed', label: 'Fixed Amount' }
        ]
      },
      {
        key: 'adjustmentValue',
        label: 'Adjustment Value',
        type: 'number',
        required: true,
      }
    ]
  },
  {
    id: 'bulk-archive',
    label: 'Archive',
    icon: <Archive className="h-4 w-4" />,
    action: async (selectedIds) => {
      console.log('Bulk archive:', selectedIds);
    },
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to archive the selected items? They will be hidden from active inventory.',
    variant: 'secondary'
  },
  {
    id: 'bulk-delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    action: async (selectedIds) => {
      console.log('Bulk delete:', selectedIds);
    },
    requiresConfirmation: true,
    confirmationMessage: 'Are you sure you want to permanently delete the selected items? This action cannot be undone.',
    variant: 'destructive'
  }
];