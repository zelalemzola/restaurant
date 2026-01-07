"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/providers/AuthProvider";
import { hasRouteAccess } from "@/lib/utils/route-permissions";
import { toast } from "@/hooks/use-toast";

interface UseRouteProtectionOptions {
  redirectTo?: string;
  showNotification?: boolean;
}

// Role-specific redirect mapping
const ROLE_REDIRECTS = {
  user: "/dashboard/inventory/products",
  manager: "/dashboard",
  admin: "/dashboard",
} as const;

export function useRouteProtection(options: UseRouteProtectionOptions = {}) {
  const { redirectTo, showNotification = true } = options;
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirectHistoryRef = useRef<string[]>([]);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && user) {
      const userRole = user.role;

      // Handle undefined role case
      if (!userRole) {
        console.warn("User role is undefined, redirecting to default");
        const targetRedirect = redirectTo || "/dashboard";
        router.push(targetRedirect);
        return;
      }

      // Check if user has access to current route
      if (!hasRouteAccess(userRole, pathname)) {
        // Prevent infinite redirect loops
        const targetRedirect =
          redirectTo ||
          ROLE_REDIRECTS[userRole as keyof typeof ROLE_REDIRECTS] ||
          "/dashboard";

        if (
          redirectHistoryRef.current.includes(pathname) ||
          hasRedirectedRef.current
        ) {
          console.warn("Redirect loop detected, stopping redirect");
          return;
        }

        // Add current path to redirect history
        redirectHistoryRef.current.push(pathname);
        hasRedirectedRef.current = true;

        // Show user-friendly notification
        if (showNotification) {
          toast({
            title: "Access Restricted",
            description: `You don't have permission to access this page. Redirecting you to an authorized area.`,
            variant: "destructive",
            duration: 5000,
          });
        }

        // Perform redirect
        router.push(targetRedirect);
      }
    }
  }, [user, isLoading, pathname, redirectTo, router, showNotification]);

  // Reset redirect flag when user changes or pathname changes to an allowed route
  useEffect(() => {
    if (user?.role && hasRouteAccess(user.role, pathname)) {
      hasRedirectedRef.current = false;
      redirectHistoryRef.current = [];
    }
  }, [user, pathname]);

  return {
    hasAccess: user?.role ? hasRouteAccess(user.role, pathname) : false,
    isLoading,
    user,
  };
}
