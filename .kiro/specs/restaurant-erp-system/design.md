# Restaurant ERP System Design Document

## Overview

The Restaurant ERP System is a comprehensive web application built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui components. It uses MongoDB for data persistence and RTK Query for efficient API state management. The system follows a modular architecture with clear separation of concerns, enabling restaurants to manage inventory, sales, costs, and analytics through an intuitive interface.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Layer     │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ - React Pages   │    │ - REST APIs     │    │ - Collections   │
│ - RTK Query     │    │ - Validation    │    │ - Indexes       │
│ - shadcn/ui     │    │ - Business Logic│    │ - Aggregations  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **State Management**: RTK Query for API calls and caching
- **Backend**: Next.js API Routes with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js (recommended addition)
- **Validation**: Zod for runtime type checking
- **UI Components**: shadcn/ui with Radix UI primitives

## Components and Interfaces

### Core Modules

#### 1. Inventory Management Module

- **Product Groups**: Create and manage categories
- **Products**: Add/edit items with custom metrics
- **Stock Levels**: Real-time inventory tracking
- **Stock Transactions**: Record usage and additions

#### 2. Sales Management Module

- **Sales Interface**: Point-of-sale functionality
- **Transaction Recording**: Capture sales with payment methods
- **Product Selection**: Multi-item sales with quantities

#### 3. Cost Management Module

- **Operational Costs**: Recurring and one-time expenses
- **Cost Categories**: Rent, salaries, utilities, maintenance
- **Expense Tracking**: Date-based cost recording

#### 4. Analytics & Reporting Module

- **Dashboard**: KPI overview and quick insights
- **Financial Reports**: Profit/loss calculations
- **Inventory Analytics**: Stock turnover and usage patterns
- **Sales Analytics**: Revenue trends and product performance

#### 5. Notification System

- **Low Stock Alerts**: Automated threshold monitoring
- **System Notifications**: Important updates and warnings
- **Alert Management**: Mark as read/unread functionality

### Page Structure

```
/dashboard              # Main dashboard with KPIs
/inventory
  /groups              # Manage product groups
  /products            # Add/edit products
  /stock-levels        # Current inventory status
  /usage               # Record material usage
/sales
  /pos                 # Point of sale interface
  /transactions        # Sales history
/costs
  /operations          # Operational expenses
  /categories          # Cost categorization
/analytics
  /financial           # P&L reports
  /inventory           # Stock analytics
  /sales              # Revenue analytics
/notifications         # System alerts
/settings             # User preferences and configuration
```

## Data Models

### Product Schema

```typescript
interface Product {
  _id: ObjectId;
  name: string;
  groupId: ObjectId;
  type: "stock" | "sellable" | "combination";
  metric: string; // kg, liters, pieces, custom
  currentQuantity: number;
  minStockLevel: number;
  costPrice?: number; // Required for stock and combination
  sellingPrice?: number; // Required for sellable and combination
  createdAt: Date;
  updatedAt: Date;
}
```

### Product Group Schema

```typescript
interface ProductGroup {
  _id: ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Stock Transaction Schema

```typescript
interface StockTransaction {
  _id: ObjectId;
  productId: ObjectId;
  type: "addition" | "usage" | "sale" | "adjustment";
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  userId: ObjectId;
  createdAt: Date;
}
```

### Sales Transaction Schema

```typescript
interface SalesTransaction {
  _id: ObjectId;
  items: Array<{
    productId: ObjectId;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  paymentMethod:
    | "CBE"
    | "Abyssinia"
    | "Zemen"
    | "Awash"
    | "Telebirr"
    | "Cash"
    | "POS";
  userId: ObjectId;
  createdAt: Date;
}
```

### Cost Operation Schema

```typescript
interface CostOperation {
  _id: ObjectId;
  description: string;
  amount: number;
  category: "rent" | "salary" | "utilities" | "maintenance" | "other";
  type: "recurring" | "one-time";
  recurringPeriod?: "monthly" | "weekly" | "yearly";
  date: Date;
  userId: ObjectId;
  createdAt: Date;
}
```

### Notification Schema

```typescript
interface Notification {
  _id: ObjectId;
  type: "low-stock" | "system" | "alert";
  title: string;
  message: string;
  productId?: ObjectId; // For low-stock notifications
  isRead: boolean;
  createdAt: Date;
}
```

## Error Handling

### API Error Responses

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface ApiSuccess<T> {
  success: true;
  data: T;
}
```

### Error Categories

- **Validation Errors**: Invalid input data (400)
- **Authentication Errors**: Unauthorized access (401)
- **Authorization Errors**: Insufficient permissions (403)
- **Not Found Errors**: Resource doesn't exist (404)
- **Business Logic Errors**: Stock insufficient, etc. (422)
- **Server Errors**: Database connection, etc. (500)

### Frontend Error Handling

- Global error boundary for React components
- RTK Query error handling with user-friendly messages
- Toast notifications for operation feedback
- Form validation with real-time feedback

## API Design

### RESTful Endpoints

#### Products API

```
GET    /api/products              # List all products
POST   /api/products              # Create new product
GET    /api/products/:id          # Get product details
PUT    /api/products/:id          # Update product
DELETE /api/products/:id          # Delete product
```

#### Inventory API

```
GET    /api/inventory/stock-levels    # Current stock levels
POST   /api/inventory/usage          # Record material usage
POST   /api/inventory/adjustment     # Stock adjustments
GET    /api/inventory/transactions   # Stock transaction history
```

#### Sales API

```
POST   /api/sales/transactions       # Record new sale
GET    /api/sales/transactions       # Sales history
GET    /api/sales/analytics          # Sales analytics data
```

#### Costs API

```
GET    /api/costs/operations         # List cost operations
POST   /api/costs/operations         # Add new cost
PUT    /api/costs/operations/:id     # Update cost
DELETE /api/costs/operations/:id     # Delete cost
```

#### Analytics API

```
GET    /api/analytics/dashboard      # Dashboard KPIs
GET    /api/analytics/financial      # P&L reports
GET    /api/analytics/inventory      # Inventory analytics
```

## Testing Strategy

### Unit Testing

- **Models**: Mongoose schema validation
- **API Routes**: Request/response handling
- **Utilities**: Business logic functions
- **Components**: React component behavior

### Integration Testing

- **API Endpoints**: Full request lifecycle
- **Database Operations**: CRUD operations
- **Authentication Flow**: Login/logout process
- **Stock Calculations**: Inventory updates

### End-to-End Testing

- **User Workflows**: Complete business processes
- **Sales Process**: From product selection to payment
- **Inventory Management**: Stock updates and notifications
- **Analytics Generation**: Report accuracy

### Testing Tools

- **Jest**: Unit and integration testing
- **React Testing Library**: Component testing
- **Supertest**: API endpoint testing
- **MongoDB Memory Server**: Database testing
- **Playwright**: E2E testing (optional)

## Performance Considerations

### Database Optimization

- **Indexes**: On frequently queried fields (productId, userId, createdAt)
- **Aggregation Pipelines**: For analytics calculations
- **Connection Pooling**: Efficient database connections
- **Data Pagination**: For large datasets

### Frontend Optimization

- **RTK Query Caching**: Reduce API calls
- **Code Splitting**: Lazy load route components
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Monitor bundle size

### Real-time Features

- **WebSocket Integration**: For live stock updates (future enhancement)
- **Optimistic Updates**: Immediate UI feedback
- **Background Sync**: Offline capability (future enhancement)

## Security Measures

### Authentication & Authorization

- **JWT Tokens**: Secure session management
- **Role-based Access**: Different user permissions
- **Password Hashing**: bcrypt for secure storage
- **Session Management**: Secure cookie handling

### Data Protection

- **Input Validation**: Zod schema validation
- **SQL Injection Prevention**: Mongoose ODM protection
- **XSS Prevention**: Content sanitization
- **CSRF Protection**: Next.js built-in protection

### API Security

- **Rate Limiting**: Prevent abuse
- **CORS Configuration**: Controlled cross-origin requests
- **Request Validation**: Strict input checking
- **Error Message Sanitization**: No sensitive data exposure
