"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/providers/AuthProvider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
  showError?: boolean;
}

// Role-specific redirect mapping
const ROLE_REDIRECTS = {
  user: "/dashboard/inventory/products",
  manager: "/dashboard",
  admin: "/dashboard",
} as const;

export function RoleProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
  showError = true,
}: RoleProtectedRouteProps) {
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
        console.warn("User role is undefined, denying access");
        if (redirectTo) {
          router.push(redirectTo);
        }
        return;
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userRole)) {
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
        toast({
          title: "Access Restricted",
          description: `You don't have permission to access this page. Redirecting you to an authorized area.`,
          variant: "destructive",
          duration: 5000,
        });

        // Perform redirect
        router.push(targetRedirect);
      }
    }
  }, [user, isLoading, allowedRoles, redirectTo, router, pathname]);

  // Reset redirect flag when user changes or component unmounts
  useEffect(() => {
    return () => {
      hasRedirectedRef.current = false;
      redirectHistoryRef.current = [];
    };
  }, [user]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Handle case where user is not authenticated
  if (!user) {
    return null;
  }

  // Handle undefined role case
  if (!user.role) {
    if (showError) {
      return (
        <div className="container mx-auto p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your account doesn&apos;t have a valid role assigned. Please
              contact an administrator.
            </AlertDescription>
          </Alert>
        </div>
      );
    }
    return null;
  }

  // Show error if user doesn't have access and showError is true
  if (!allowedRoles.includes(user.role) && showError) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don&apos;t have permission to access this page. Your role (
            {user.role}) is not authorized.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render children if user has access
  if (allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  // Default fallback
  return null;
}
