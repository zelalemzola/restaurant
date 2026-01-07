# Urgent System Fixes Design

## Overview

This design addresses four critical system issues in the Restaurant ERP system:

1. Terminal interface errors and stability issues
2. Role-based access control with proper redirects for "user" role
3. React component errors in stock levels management (infinite re-renders)
4. User management API failures with MongoDB ObjectId handling

The design focuses on immediate fixes while maintaining system stability and user experience.

## Architecture

### Current System Architecture

- **Frontend**: Next.js 14 with React components and RTK Query for state management
- **Backend**: Next.js API routes with MongoDB database
- **Authentication**: Better Auth system with role-based permissions
- **State Management**: React hooks with useEffect for component lifecycle
- **Database**: MongoDB with mixed document ID formats (Better Auth 'id' vs MongoDB '\_id')

### Problem Areas Identified

1. **Terminal Interface**: Unspecified errors requiring investigation
2. **Role-Based Access**: Missing redirect logic for "user" role to `/dashboard/inventory/products`
3. **Stock Monitoring Hook**: Infinite re-renders due to dependency array issues in useEffect
4. **User API**: Inconsistent MongoDB document ID handling between Better Auth and native MongoDB

## Components and Interfaces

### 1. Terminal Interface Fixes

**Component**: Terminal error handling system

- **Interface**: Error logging and display mechanism
- **Responsibility**: Capture and display terminal errors with actionable guidance
- **Dependencies**: System command execution, error logging utilities

### 2. Role-Based Access Control Enhancement

**Components**:

- `RoleProtectedRoute` component (existing, needs fixes)
- `useRouteProtection` hook (existing, needs fixes)
- Middleware for route protection (existing, needs enhancement)

**Interfaces**:

```typescript
interface RoleRedirectConfig {
  role: string;
  unauthorizedRedirect: string;
  allowedRoutes: string[];
}

interface RouteProtectionOptions {
  redirectTo?: string;
  showNotification?: boolean;
  preventInfiniteRedirect?: boolean;
}
```

**Key Changes**:

- Fix TypeScript errors with undefined role handling
- Add specific redirect logic for "user" role to `/dashboard/inventory/products`
- Implement redirect loop prevention
- Add user-friendly notification messages

### 3. Stock Levels Component Error Resolution

**Component**: `StockLevelsDashboard` and `useStockMonitoring` hook

**Root Cause Analysis**:

- `useStockMonitoring` hook has `previousStockLevels` in useEffect dependency array
- This causes infinite re-renders because `setPreviousStockLevels` creates new Map objects
- Filter components trigger unnecessary re-renders

**Solution Architecture**:

```typescript
// Fixed hook structure
interface StockMonitoringState {
  previousLevels: Map<string, number>;
  alerts: StockAlert[];
  isInitialized: boolean;
}

// Use useRef for stable references
const previousStockLevelsRef = useRef<Map<string, number>>(new Map());
const isInitializedRef = useRef(false);
```

**Key Changes**:

- Replace useState with useRef for previousStockLevels to avoid dependency issues
- Implement proper initialization flag to prevent multiple initializations
- Fix dependency arrays in all useEffect hooks
- Add error boundaries for component crash prevention

### 4. User Management API Enhancement

**Component**: `/api/users/[id]/route.ts`

**Current Issues**:

- Inconsistent ID handling between Better Auth (`id` field) and MongoDB (`_id` field)
- User lookup failures due to ID format mismatches
- Delete operations failing to find users

**Solution Architecture**:

```typescript
interface UserLookupStrategy {
  findUserById(id: string): Promise<UserDocument | null>;
  deleteUserById(id: string): Promise<boolean>;
  updateUserById(id: string, data: UpdateData): Promise<UserDocument | null>;
}

// Unified user lookup function
async function findUserByAnyId(
  db: Db,
  id: string
): Promise<UserDocument | null> {
  // Try Better Auth 'id' field first
  let user = await db.collection("user").findOne({ id: id });

  // Fallback to MongoDB '_id' field
  if (!user && mongoose.Types.ObjectId.isValid(id)) {
    user = await db
      .collection("user")
      .findOne({ _id: new mongoose.Types.ObjectId(id) });
  }

  return user;
}
```

**Key Changes**:

- Implement unified user lookup strategy
- Handle both Better Auth ID format and MongoDB ObjectId format
- Add proper error messages for debugging
- Ensure consistent ID handling across GET, PUT, and DELETE operations

## Data Models

### User Document Structure (MongoDB)

Based on the provided user data:

```typescript
interface UserDocument {
  _id: ObjectId; // MongoDB native ID
  id?: string; // Better Auth ID (may not exist on all documents)
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "user";
  emailVerified: Date | boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Stock Level Data Model

```typescript
interface StockLevelItem {
  _id: string;
  name: string;
  currentQuantity: number;
  minStockLevel: number;
  metric: string;
  stockStatus: "in-stock" | "low-stock" | "out-of-stock";
  group: { name: string };
  isLowStock: boolean;
}
```

### Role Configuration Model

```typescript
interface RoleConfig {
  role: "admin" | "manager" | "user";
  defaultRedirect: string;
  allowedRoutes: string[];
  restrictedRoutes: string[];
}
```

## Error Handling

### 1. Terminal Error Handling

- Implement comprehensive error logging with stack traces
- Create user-friendly error messages with suggested actions
- Add error recovery mechanisms for common terminal issues

### 2. Role-Based Access Error Handling

- Prevent infinite redirect loops with redirect history tracking
- Show clear notification messages when users are redirected
- Handle undefined role scenarios gracefully

### 3. React Component Error Handling

- Add error boundaries around stock level components
- Implement fallback UI for component crashes
- Add debugging information for useEffect dependency issues

### 4. API Error Handling

- Standardize error response format across all user management endpoints
- Add detailed logging for user lookup failures
- Implement proper HTTP status codes for different error scenarios

## Testing Strategy

### Unit Testing

- Test role-based redirect logic with different user roles
- Test user lookup functions with various ID formats
- Test stock monitoring hook with different data scenarios
- Test error handling functions with edge cases

### Integration Testing

- Test complete user management workflow (create, read, update, delete)
- Test role-based access control across different routes
- Test stock level component with real API data
- Test terminal interface with various command scenarios

### Error Scenario Testing

- Test infinite redirect prevention
- Test React component error recovery
- Test API error handling with malformed requests
- Test database connection failures

## Implementation Priorities

### Phase 1: Critical Fixes (Immediate)

1. Fix useStockMonitoring hook infinite re-render issue
2. Fix user management API ID handling
3. Implement role-based redirects for "user" role

### Phase 2: Stability Improvements

1. Add comprehensive error handling
2. Implement error boundaries
3. Fix terminal interface issues

### Phase 3: Testing and Validation

1. Add unit tests for critical functions
2. Implement integration tests
3. Add monitoring and alerting

## Security Considerations

- Ensure role-based access control cannot be bypassed
- Validate all user inputs in API endpoints
- Implement proper session handling for redirects
- Add audit logging for user management operations
- Prevent information disclosure in error messages

## Performance Considerations

- Minimize re-renders in stock level components
- Optimize database queries for user lookup
- Implement proper caching for role-based access checks
- Use efficient data structures for stock monitoring

## Monitoring and Observability

- Add logging for all redirect operations
- Monitor React component error rates
- Track API error rates and response times
- Implement health checks for critical system components
