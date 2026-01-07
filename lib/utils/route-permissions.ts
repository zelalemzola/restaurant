// Route-based role permissions configuration
export const ROUTE_PERMISSIONS = {
  // Dashboard routes - accessible to all roles
  "/dashboard": ["admin", "manager", "user"],

  // Inventory routes - accessible to all roles
  "/dashboard/inventory": ["admin", "manager", "user"],
  "/dashboard/inventory/stock-levels": ["admin", "manager", "user"],
  "/dashboard/inventory/products": ["admin", "manager", "user"],
  "/dashboard/inventory/groups": ["admin", "manager", "user"],
  "/dashboard/inventory/usage": ["admin", "manager", "user"],

  // Sales routes - accessible to all roles
  "/sales": ["admin", "manager", "user"],
  "/sales/pos": ["admin", "manager", "user"],
  "/sales/transactions": ["admin", "manager", "user"],

  // Costs routes - accessible to all roles
  "/costs": ["admin", "manager", "user"],

  // Notifications routes - accessible to all roles
  "/dashboard/notifications": ["admin", "manager", "user"],

  // Analytics routes - admin and manager only
  "/analytics": ["admin", "manager"],

  // User management routes - admin and manager only
  "/dashboard/users": ["admin", "manager"],

  // Audit routes - admin and manager only
  "/audit": ["admin", "manager"],

  // System routes - admin only
  "/system": ["admin"],
} as const;

export type RoutePath = keyof typeof ROUTE_PERMISSIONS;

/**
 * Check if a user role has access to a specific route
 */
export function hasRouteAccess(userRole: string, route: string): boolean {
  // Check exact match first
  if (ROUTE_PERMISSIONS[route as RoutePath]) {
    return (
      ROUTE_PERMISSIONS[route as RoutePath] as readonly string[]
    ).includes(userRole);
  }

  // Check for parent route matches (e.g., /dashboard/inventory/products matches /dashboard/inventory)
  const routeParts = route.split("/");
  for (let i = routeParts.length - 1; i > 0; i--) {
    const parentRoute = routeParts.slice(0, i + 1).join("/");
    if (ROUTE_PERMISSIONS[parentRoute as RoutePath]) {
      return (
        ROUTE_PERMISSIONS[parentRoute as RoutePath] as readonly string[]
      ).includes(userRole);
    }
  }

  // Default to allowing access if no specific rule is found
  return true;
}

/**
 * Get the allowed roles for a specific route
 */
export function getAllowedRoles(route: string): string[] {
  if (ROUTE_PERMISSIONS[route as RoutePath]) {
    return [...ROUTE_PERMISSIONS[route as RoutePath]];
  }

  // Check for parent route matches
  const routeParts = route.split("/");
  for (let i = routeParts.length - 1; i > 0; i--) {
    const parentRoute = routeParts.slice(0, i + 1).join("/");
    if (ROUTE_PERMISSIONS[parentRoute as RoutePath]) {
      return [...ROUTE_PERMISSIONS[parentRoute as RoutePath]];
    }
  }

  // Default to all roles if no specific rule is found
  return ["admin", "manager", "user"];
}
