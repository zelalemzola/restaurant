// Role-Based Access Control (RBAC) utilities
import { User } from "@/lib/auth";

export type UserRole = "admin" | "manager" | "user";

export type Permission =
  | "products.create"
  | "products.read"
  | "products.update"
  | "products.delete"
  | "inventory.read"
  | "inventory.update"
  | "inventory.adjust"
  | "sales.create"
  | "sales.read"
  | "sales.update"
  | "sales.delete"
  | "costs.create"
  | "costs.read"
  | "costs.update"
  | "costs.delete"
  | "analytics.read"
  | "analytics.export"
  | "users.create"
  | "users.read"
  | "users.update"
  | "users.delete"
  | "audit.read"
  | "system.backup"
  | "system.restore";

// Flexible user type that can handle both AuthUser and BetterAuth User types
type FlexibleUser = {
  role?: string | null;
  [key: string]: any;
} | null;

// Define role permissions
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    "products.create",
    "products.read",
    "products.update",
    "products.delete",
    "inventory.read",
    "inventory.update",
    "inventory.adjust",
    "sales.create",
    "sales.read",
    "sales.update",
    "sales.delete",
    "costs.create",
    "costs.read",
    "costs.update",
    "costs.delete",
    "analytics.read",
    "analytics.export",
    "users.create",
    "users.read",
    "users.update",
    "users.delete",
    "audit.read",
    "system.backup",
    "system.restore",
  ],
  manager: [
    // Most operations except user management and system operations
    "products.create",
    "products.read",
    "products.update",
    "products.delete",
    "inventory.read",
    "inventory.update",
    "inventory.adjust",
    "sales.create",
    "sales.read",
    "sales.update",
    "costs.create",
    "costs.read",
    "costs.update",
    "costs.delete",
    "analytics.read",
    "analytics.export",
    "users.read", // Can view users but not modify
    "audit.read",
  ],
  user: [
    // Basic operations only
    "products.read",
    "products.create", // Added create permission for users
    "inventory.read",
    "inventory.update", // Can record usage
    "sales.create",
    "sales.read",
    "costs.read",
    "analytics.read",
  ],
};

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: FlexibleUser,
  permission: Permission
): boolean {
  if (!user || !user.role) {
    return false;
  }

  const userRole = user.role as UserRole;
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  user: FlexibleUser,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  user: FlexibleUser,
  permissions: Permission[]
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/**
 * Get all permissions for a user role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a role can perform an action on a resource
 */
export function canPerformAction(
  user: FlexibleUser,
  resource: string,
  action: "create" | "read" | "update" | "delete"
): boolean {
  const permission = `${resource}.${action}` as Permission;
  return hasPermission(user, permission);
}

/**
 * Middleware function to check permissions
 */
export function requirePermission(permission: Permission) {
  return (user: FlexibleUser) => {
    if (!hasPermission(user, permission)) {
      throw new Error(`Access denied. Required permission: ${permission}`);
    }
    return true;
  };
}

/**
 * Middleware function to check role
 */
export function requireRole(requiredRole: UserRole) {
  return (user: FlexibleUser) => {
    if (!user || !user.role) {
      throw new Error("Access denied. Authentication required.");
    }

    const userRole = user.role as UserRole;
    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      manager: 2,
      admin: 3,
    };

    if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
      throw new Error(`Access denied. Required role: ${requiredRole}`);
    }

    return true;
  };
}

/**
 * Check if user can access audit logs
 */
export function canAccessAuditLogs(user: FlexibleUser): boolean {
  return hasPermission(user, "audit.read");
}

/**
 * Check if user can perform system operations
 */
export function canPerformSystemOperations(user: FlexibleUser): boolean {
  return hasAnyPermission(user, ["system.backup", "system.restore"]);
}

/**
 * Filter data based on user permissions
 */
export function filterByPermissions<T>(
  user: FlexibleUser,
  data: T[],
  resourceType: string,
  filterFn?: (item: T, user: NonNullable<FlexibleUser>) => boolean
): T[] {
  if (!canPerformAction(user, resourceType, "read")) {
    return [];
  }

  if (filterFn && user) {
    return data.filter((item) => filterFn(item, user));
  }

  return data;
}
