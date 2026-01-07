# Inventory Cost and Authentication Fixes Design

## Overview

This design addresses three critical system issues: inventory cost tracking integration, user authentication failures, and missing low stock notifications. The solution involves creating automatic cost expense records for inventory additions, fixing the user authentication flow, and implementing a comprehensive notification system.

## Architecture

### 1. Cost Tracking Integration Architecture

The current system has separate cost operations and inventory management. We need to bridge these systems by:

- **Automatic Cost Expense Creation**: When products are added to inventory, automatically create corresponding cost expense records
- **Cost Expense Model**: Extend or create a cost expense tracking system that links inventory additions to business expenses
- **Integration Points**: Hook into product creation and stock transaction APIs

### 2. User Authentication Fix Architecture

The current system uses better-auth with MongoDB adapter but has issues with user creation flow:

- **Authentication Flow**: Fix the user creation process to ensure proper credential storage
- **Password Hashing**: Ensure consistent password hashing between creation and login
- **Account Record Creation**: Verify proper account record creation in better-auth collections

### 3. Notification System Architecture

Implement a comprehensive notification system for low stock alerts:

- **Notification Service**: Create a centralized notification service
- **Real-time Updates**: Integrate with existing event broadcasting system
- **Notification Storage**: Use existing notification model and API
- **Badge System**: Implement notification count badges in the UI

## Components and Interfaces

### 1. Cost Expense Integration

#### CostExpenseService

```typescript
interface CostExpenseService {
  createInventoryExpense(
    productId: string,
    quantity: number,
    costPrice: number
  ): Promise<CostExpense>;
  calculateTotalInventoryExpenses(dateRange?: DateRange): Promise<number>;
  linkInventoryToCosts(
    stockTransactionId: string,
    costExpenseId: string
  ): Promise<void>;
}
```

#### Enhanced Product Creation Flow

- Modify product creation API to automatically create cost expense records
- Add cost expense creation to stock transaction processing
- Ensure atomic operations for data consistency

### 2. User Authentication Fix

#### Enhanced User Creation API

```typescript
interface UserCreationFlow {
  validateUserData(userData: CreateUserData): Promise<ValidationResult>;
  createBetterAuthUser(userData: CreateUserData): Promise<BetterAuthUser>;
  createAccountRecord(
    userId: string,
    hashedPassword: string
  ): Promise<AccountRecord>;
  verifyUserCanLogin(email: string, password: string): Promise<boolean>;
}
```

#### Authentication Verification

- Add post-creation login verification
- Implement consistent password hashing
- Fix account record creation in better-auth collections

### 3. Notification System Implementation

#### NotificationService Enhancement

```typescript
interface NotificationService {
  createLowStockNotification(
    productId: string,
    currentStock: number,
    minStock: number
  ): Promise<Notification>;
  getUnreadNotificationCount(userId?: string): Promise<number>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  cleanupExpiredNotifications(): Promise<void>;
}
```

#### Low Stock Monitoring

- Implement stock level monitoring service
- Create automatic notification triggers
- Add real-time notification updates

## Data Models

### 1. Cost Expense Model Enhancement

```typescript
interface CostExpense {
  _id: ObjectId;
  type: "inventory" | "operational" | "overhead";
  category: string;
  description: string;
  amount: number;
  date: Date;
  productId?: ObjectId; // Link to product for inventory expenses
  stockTransactionId?: ObjectId; // Link to stock transaction
  userId: ObjectId;
  metadata: {
    productName?: string;
    quantity?: number;
    costPrice?: number;
    reason?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Enhanced Notification Model

```typescript
interface Notification {
  _id: ObjectId;
  type: "low_stock" | "product_created" | "cost_created" | "system";
  title: string;
  message: string;
  data: {
    productId?: ObjectId;
    currentStock?: number;
    minStock?: number;
    urgencyLevel?: "critical" | "warning" | "low";
  };
  userId?: ObjectId; // null for system-wide notifications
  isRead: boolean;
  priority: "low" | "medium" | "high";
  category: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. User Authentication Data Flow

```typescript
// Better-auth user collection structure
interface BetterAuthUser {
  _id: ObjectId;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "manager" | "user";
  emailVerified: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Better-auth account collection structure
interface BetterAuthAccount {
  _id: ObjectId;
  userId: ObjectId;
  accountId: string; // Format: "email:user@example.com"
  providerId: "credential";
  password: string; // Hashed password
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### 1. Cost Expense Creation Errors

- **Database Transaction Failures**: Implement rollback mechanisms for failed cost expense creation
- **Invalid Product Data**: Validate product exists and has valid cost price before creating expense
- **Calculation Errors**: Handle edge cases in cost calculations and provide meaningful error messages

### 2. Authentication Errors

- **Duplicate User Creation**: Prevent duplicate users and provide clear error messages
- **Password Hashing Failures**: Implement fallback mechanisms and error logging
- **Account Record Failures**: Ensure proper cleanup if account creation fails

### 3. Notification System Errors

- **Stock Level Calculation Errors**: Handle edge cases in stock level monitoring
- **Notification Creation Failures**: Implement retry mechanisms for failed notifications
- **Real-time Update Failures**: Graceful degradation when real-time updates fail

## Testing Strategy

### 1. Cost Expense Integration Testing

- **Unit Tests**: Test cost expense creation logic with various product types
- **Integration Tests**: Test end-to-end flow from product creation to cost expense creation
- **Data Consistency Tests**: Verify atomic operations and rollback mechanisms

### 2. Authentication Flow Testing

- **User Creation Tests**: Test complete user creation and login flow
- **Password Validation Tests**: Test password hashing and verification consistency
- **Edge Case Tests**: Test duplicate users, invalid data, and error scenarios

### 3. Notification System Testing

- **Low Stock Detection Tests**: Test notification triggers at various stock levels
- **Real-time Update Tests**: Test notification broadcasting and UI updates
- **Performance Tests**: Test notification system under load

## Implementation Phases

### Phase 1: Cost Expense Integration

1. Create cost expense service and models
2. Integrate with product creation API
3. Add cost expense creation to inventory operations
4. Update costs page to include inventory expenses

### Phase 2: Authentication Fix

1. Debug current user creation flow
2. Fix password hashing and account record creation
3. Add post-creation verification
4. Test complete authentication flow

### Phase 3: Notification System

1. Implement low stock monitoring service
2. Create notification triggers and management
3. Add notification badges and UI components
4. Integrate with real-time update system

## Security Considerations

### 1. Cost Data Security

- Ensure only authorized users can view cost expense data
- Implement audit trails for cost expense modifications
- Validate cost calculations to prevent manipulation

### 2. Authentication Security

- Use secure password hashing (bcrypt with appropriate rounds)
- Implement proper session management
- Add rate limiting for authentication attempts

### 3. Notification Security

- Prevent notification spam and abuse
- Ensure users only see notifications they're authorized to view
- Implement proper data sanitization for notification content
