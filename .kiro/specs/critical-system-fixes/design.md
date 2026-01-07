# Design Document

## Overview

This design addresses critical system bugs through targeted fixes to user management APIs, React component state management, and role-based access control. The approach focuses on identifying root causes and implementing stable, maintainable solutions.

## Architecture

### User Management Fix Architecture

- **API Layer**: Fix user ID handling in REST endpoints
- **Database Layer**: Ensure proper ObjectId conversion and validation
- **Error Handling**: Implement comprehensive error responses

### Stock Levels Page Architecture

- **State Management**: Refactor filter state to prevent infinite loops
- **Component Structure**: Implement proper useEffect dependencies
- **Error Boundaries**: Add resilient error handling for filter components

### Role-Based Access Control Architecture

- **Navigation Component**: Dynamic menu rendering based on user roles
- **Route Protection**: Middleware-level access validation
- **Permission System**: Centralized role-to-permission mapping

## Components and Interfaces

### 1. User Management API Fixes

**API Endpoints**:

- `PUT /api/users/[id]` - User update endpoint
- `DELETE /api/users/[id]` - User deletion endpoint

**Key Changes**:

- Proper ObjectId conversion from string parameters
- Validation of user existence before operations
- Consistent error response format
- Transaction handling for data integrity

### 2. Stock Levels Page Component

**Filter State Management**:

```typescript
interface FilterState {
  typeFilter: string | null;
  groupFilter: string | null;
  statusFilter: string | null;
}

interface FilterHandlers {
  onTypeChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}
```

**Key Changes**:

- Memoized filter handlers to prevent recreation
- Proper useEffect dependencies
- Stable state updates without circular dependencies

### 3. Stock Monitoring Hook

**Hook Interface**:

```typescript
interface UseStockMonitoringReturn {
  alerts: StockAlert[];
  isMonitoring: boolean;
  clearAlert: (alertId: string) => void;
}
```

**Key Changes**:

- Proper dependency arrays in useEffect
- Memoized comparison functions
- Stable state updates with functional updates

### 4. Stock Adjustment Dialog

**Dialog State Management**:

- Controlled open/close state
- Form state isolation
- Proper cleanup on unmount

### 5. Role-Based Navigation

**Navigation Interface**:

```typescript
interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType;
  roles: UserRole[];
}

interface RolePermissions {
  user: string[];
  manager: string[];
  admin: string[];
}
```

**Key Changes**:

- Dynamic menu filtering based on user role
- Centralized permission configuration
- Route-level access validation

## Data Models

### User Role Permissions

```typescript
const ROLE_PERMISSIONS = {
  user: [
    "/dashboard/inventory",
    "/dashboard/sales",
    "/dashboard/notifications",
    "/dashboard/costs",
  ],
  manager: [
    "/dashboard/inventory",
    "/dashboard/sales",
    "/dashboard/notifications",
    "/dashboard/costs",
    "/dashboard/analytics",
    "/dashboard/audit",
  ],
  admin: ["*"], // All pages
};
```

### Filter State Schema

```typescript
interface StockFilters {
  type: string | null;
  group: string | null;
  status: string | null;
}
```

## Error Handling

### API Error Responses

- Standardized error format with status codes
- Descriptive error messages for debugging
- Proper HTTP status codes (404, 400, 500)

### Component Error Boundaries

- Graceful degradation for filter components
- Error recovery mechanisms
- User-friendly error messages

### State Management Errors

- Prevention of infinite loops through proper dependencies
- Stable state updates using functional form
- Memory leak prevention through cleanup

## Testing Strategy

### Unit Tests

- API endpoint testing with various ID formats
- Component state management testing
- Hook behavior validation
- Role permission logic testing

### Integration Tests

- End-to-end user management workflows
- Filter interaction testing
- Navigation access control testing
- Stock adjustment dialog workflows

### Error Scenario Testing

- Invalid user ID handling
- Network failure scenarios
- Permission denial testing
- Component crash recovery

## Implementation Approach

### Phase 1: User Management Fixes

1. Fix API endpoints for proper ObjectId handling
2. Add comprehensive error handling
3. Test user edit/delete operations

### Phase 2: Stock Levels Page Fixes

1. Refactor filter state management
2. Fix useEffect dependencies
3. Implement stable filter handlers
4. Fix stock monitoring hook

### Phase 3: Dialog Component Fixes

1. Fix stock adjustment dialog state
2. Prevent infinite rendering loops
3. Implement proper cleanup

### Phase 4: Role-Based Access Control

1. Implement dynamic navigation filtering
2. Add route-level permission checks
3. Test access restrictions for different roles

## Performance Considerations

- Memoization of expensive computations
- Proper React key usage for list rendering
- Debounced filter operations
- Efficient state updates to prevent unnecessary re-renders

## Security Considerations

- Proper user authentication validation
- Role-based access enforcement at API level
- Input sanitization for user operations
- Secure session management
