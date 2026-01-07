# Design Document

## Overview

This design addresses three critical deployment issues that prevent the restaurant ERP system from functioning properly in production:

1. **Infinite Update Loop in Stock Levels Page**: The Select component is causing maximum update depth exceeded errors due to recursive state updates
2. **Limited Stock Monitoring**: Stock level monitoring only considers products with type "stock", missing other product types that need inventory tracking
3. **Cost Price Treatment**: Cost prices are not consistently treated as restaurant expenses throughout the system

## Architecture

### 1. Select Component Stabilization

**Problem Analysis**: The infinite loop occurs because the Select component's state management is causing recursive updates. The issue is likely in the `SelectTrigger` component where multiple state changes trigger each other.

**Solution**: Implement state stabilization using `useCallback` and `useMemo` hooks to prevent unnecessary re-renders and break the update cycle.

### 2. Universal Stock Monitoring System

**Problem Analysis**: Current stock monitoring only tracks products with `type: "stock"`, but the system needs to monitor all products that can have inventory levels, including combination products and sellable items.

**Solution**: Extend stock monitoring to include all product types that have quantity tracking, with configurable stock level thresholds per product type.

### 3. Cost Accounting Integration

**Problem Analysis**: Cost prices are stored in the Product model but not consistently treated as operational expenses in financial calculations and reporting.

**Solution**: Integrate cost price changes into the expense tracking system and ensure all cost-related displays and calculations use the cost price as a restaurant expense.

## Components and Interfaces

### 1. Select Component Fixes

**Modified Components**:

- `components/ui/select.tsx` - Add memoization and callback optimization
- `app/dashboard/inventory/stock-levels/page.tsx` - Optimize state management

**Key Changes**:

```typescript
// Memoized select handlers to prevent infinite loops
const memoizedHandlers = useMemo(
  () => ({
    onTypeChange: (value: string) => {
      setTypeFilter(value === "all" ? "" : value);
      handleFilterChange();
    },
    onGroupChange: (value: string) => {
      setGroupFilter(value === "all" ? "" : value);
      handleFilterChange();
    },
    onStatusChange: (value: string) => {
      setStatusFilter(value === "all" ? "" : value);
      handleFilterChange();
    },
  }),
  [handleFilterChange]
);
```

### 2. Enhanced Stock Monitoring

**Modified Components**:

- Stock monitoring hooks and services
- Product model queries
- Stock level calculation logic

**New Stock Status Logic**:

```typescript
interface StockMonitoringConfig {
  productType: string;
  enableStockTracking: boolean;
  minStockLevel: number;
  alertThreshold: number;
}

// Universal stock status calculation
function calculateStockStatus(product: Product): StockStatus {
  // Check all product types, not just "stock"
  if (product.currentQuantity <= 0) return "out-of-stock";
  if (product.currentQuantity <= product.minStockLevel) return "low-stock";
  return "in-stock";
}
```

### 3. Cost Integration System

**Modified Components**:

- Cost tracking services
- Financial reporting components
- Product cost management

**Cost Expense Integration**:

```typescript
interface CostExpenseEntry {
  productId: string;
  costPrice: number;
  quantity: number;
  totalCost: number;
  expenseCategory: "inventory" | "operational" | "overhead";
  recordedAt: Date;
}

// Automatic cost expense recording
function recordCostAsExpense(product: Product, quantity: number) {
  const expenseEntry: CostExpenseEntry = {
    productId: product._id,
    costPrice: product.costPrice,
    quantity,
    totalCost: product.costPrice * quantity,
    expenseCategory: "inventory",
    recordedAt: new Date(),
  };

  // Record in expense tracking system
  return createExpenseEntry(expenseEntry);
}
```

## Data Models

### 1. Enhanced Product Stock Tracking

**Extended Product Interface**:

```typescript
interface ProductStockConfig {
  enableStockTracking: boolean;
  stockTrackingType: "automatic" | "manual" | "disabled";
  lowStockNotifications: boolean;
  restockingEnabled: boolean;
}

interface Product {
  // ... existing fields
  stockConfig: ProductStockConfig;
  lastStockUpdate: Date;
  stockUpdateHistory: StockUpdateEntry[];
}
```

### 2. Cost Expense Integration

**Cost Expense Model**:

```typescript
interface CostExpense {
  _id: string;
  productId: string;
  costPrice: number;
  quantity: number;
  totalAmount: number;
  expenseType: "product_cost";
  category: "inventory" | "operational" | "overhead";
  recordedAt: Date;
  updatedBy: string;
  metadata: {
    productName: string;
    productType: string;
    costPerUnit: number;
  };
}
```

## Error Handling

### 1. Select Component Error Recovery

**Error Boundaries**: Implement error boundaries around Select components to catch and recover from infinite loop errors.

**Fallback UI**: Provide fallback UI when Select components fail to render properly.

**State Reset**: Implement state reset mechanisms to break out of infinite update cycles.

### 2. Stock Monitoring Error Handling

**Graceful Degradation**: If stock monitoring fails for certain products, continue monitoring others.

**Retry Logic**: Implement retry mechanisms for failed stock level updates.

**Error Notifications**: Provide clear error messages when stock monitoring encounters issues.

### 3. Cost Integration Error Handling

**Transaction Rollback**: If cost expense recording fails, rollback product cost updates.

**Validation**: Validate cost price data before recording as expenses.

**Audit Trail**: Maintain audit trail for all cost-related operations.

## Testing Strategy

### 1. Select Component Testing

**Unit Tests**:

- Test Select component rendering without infinite loops
- Test state management and callback optimization
- Test error boundary functionality

**Integration Tests**:

- Test Select components within the stock levels page
- Test filter interactions and state updates

### 2. Stock Monitoring Testing

**Unit Tests**:

- Test stock status calculation for all product types
- Test low stock detection and notifications
- Test restocking functionality

**Integration Tests**:

- Test end-to-end stock monitoring workflow
- Test stock level updates and alerts

### 3. Cost Integration Testing

**Unit Tests**:

- Test cost expense recording functionality
- Test cost price validation and processing
- Test expense categorization logic

**Integration Tests**:

- Test cost price updates triggering expense entries
- Test financial reporting with integrated cost data
- Test cost tracking across different product operations
