'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, X, Calendar, SortAsc, SortDesc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';

export interface SearchFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value: any;
  label?: string;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
  label?: string;
}

interface AdvancedSearchProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: SearchFilter[];
  onFiltersChange: (filters: SearchFilter[]) => void;
  sortOptions: SortOption[];
  onSortChange: (sort: SortOption[]) => void;
  availableFields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select';
    options?: Array<{ value: string; label: string }>;
  }>;
  placeholder?: string;
  className?: string;
}

export function AdvancedSearch({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  sortOptions,
  onSortChange,
  availableFields,
  placeholder = "Search...",
  className = "",
}: AdvancedSearchProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<SearchFilter>>({});

  const addFilter = () => {
    if (newFilter.field && newFilter.operator && newFilter.value !== undefined) {
      const field = availableFields.find(f => f.key === newFilter.field);
      const filter: SearchFilter = {
        field: newFilter.field,
        operator: newFilter.operator,
        value: newFilter.value,
        label: field?.label || newFilter.field,
      };
      onFiltersChange([...filters, filter]);
      setNewFilter({});
      setIsFilterOpen(false);
    }
  };

  const removeFilter = (index: number) => {
    const newFilters = filters.filter((_, i) => i !== index);
    onFiltersChange(newFilters);
  };

  const toggleSort = (field: string) => {
    const existingSort = sortOptions.find(s => s.field === field);
    const fieldInfo = availableFields.find(f => f.key === field);
    
    if (existingSort) {
      if (existingSort.direction === 'asc') {
        // Change to desc
        const newSort = sortOptions.map(s => 
          s.field === field ? { ...s, direction: 'desc' as const } : s
        );
        onSortChange(newSort);
      } else {
        // Remove sort
        const newSort = sortOptions.filter(s => s.field !== field);
        onSortChange(newSort);
      }
    } else {
      // Add asc sort
      const newSort: SortOption = {
        field,
        direction: 'asc',
        label: fieldInfo?.label || field,
      };
      onSortChange([...sortOptions, newSort]);
    }
  };

  const clearAllFilters = () => {
    onSearchChange('');
    onFiltersChange([]);
    onSortChange([]);
  };

  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greater', label: 'Greater than' },
          { value: 'less', label: 'Less than' },
          { value: 'between', label: 'Between' },
        ];
      case 'date':
        return [
          { value: 'equals', label: 'On date' },
          { value: 'greater', label: 'After' },
          { value: 'less', label: 'Before' },
          { value: 'between', label: 'Between' },
        ];
      case 'select':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' },
        ];
      default:
        return [{ value: 'contains', label: 'Contains' }];
    }
  };

  const renderFilterValue = (field: any, operator: string) => {
    if (!field) return null;

    switch (field.type) {
      case 'select':
        return (
          <Select
            value={newFilter.value || ''}
            onValueChange={(value) => setNewFilter({ ...newFilter, value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value" />
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
      case 'number':
        return (
          <Input
            type="number"
            placeholder="Enter number"
            value={newFilter.value || ''}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={newFilter.value || ''}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
          />
        );
      default:
        return (
          <Input
            placeholder="Enter value"
            value={newFilter.value || ''}
            onChange={(e) => setNewFilter({ ...newFilter, value: e.target.value })}
          />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {filters.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="font-medium">Add Filter</div>
              
              <div className="space-y-3">
                <div>
                  <Label>Field</Label>
                  <Select
                    value={newFilter.field || ''}
                    onValueChange={(value) => setNewFilter({ ...newFilter, field: value, operator: undefined, value: undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newFilter.field && (
                  <div>
                    <Label>Operator</Label>
                    <Select
                      value={newFilter.operator || ''}
                      onValueChange={(value) => setNewFilter({ ...newFilter, operator: value as any, value: undefined })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorOptions(availableFields.find(f => f.key === newFilter.field)?.type || 'text').map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {newFilter.field && newFilter.operator && (
                  <div>
                    <Label>Value</Label>
                    {renderFilterValue(
                      availableFields.find(f => f.key === newFilter.field),
                      newFilter.operator
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={addFilter} size="sm" className="flex-1">
                  Add Filter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setNewFilter({})}
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {(filters.length > 0 || sortOptions.length > 0 || searchTerm) && (
          <Button variant="outline" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Active Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {filter.label}: {filter.operator} {filter.value}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeFilter(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Sort Options */}
      {availableFields.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {availableFields.map((field) => {
            const sortOption = sortOptions.find(s => s.field === field.key);
            return (
              <Button
                key={field.key}
                variant={sortOption ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort(field.key)}
                className="flex items-center gap-1"
              >
                {field.label}
                {sortOption && (
                  sortOption.direction === 'asc' ? 
                    <SortAsc className="h-3 w-3" /> : 
                    <SortDesc className="h-3 w-3" />
                )}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}