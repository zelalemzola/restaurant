"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/providers/AuthProvider";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { hasPermission, Permission } from "@/lib/utils/rbac";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Users,
  ChevronDown,
  ChevronRight,
  Activity,
} from "lucide-react";
import { ModeToggle } from "../ModeToggle";

interface AppLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: any;
  permission?: Permission;
  allowedRoles?: string[]; // Add role-based access control
  children?: Array<{
    name: string;
    href: string;
  }>;
}

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    allowedRoles: ["admin", "manager"], // All roles can access dashboard
  },
  {
    name: "Inventory",
    href: "/dashboard/",
    icon: Package,
    allowedRoles: ["admin", "manager", "user"], // All roles can access inventory
    children: [
      { name: "Stock Levels", href: "/dashboard/inventory/stock-levels" },
      { name: "Products", href: "/dashboard/inventory/products" },
      { name: "Groups", href: "/dashboard/inventory/groups" },
      { name: "Usage", href: "/dashboard/inventory/usage" },
    ],
  },
  {
    name: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    allowedRoles: ["admin", "manager", "user"], // All roles can access sales
    children: [
      { name: "Point of Sale", href: "/sales/pos" },
      { name: "Transactions", href: "/sales/transactions" },
    ],
  },
  {
    name: "Costs",
    href: "/costs",
    icon: DollarSign,
    allowedRoles: ["admin", "manager", "user"], // All roles can access costs
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    allowedRoles: ["admin", "manager"], // Only admin and manager can access analytics
  },
  // {
  //   name: "Notifications",
  //   href: "/dashboard/notifications",
  //   icon: Bell,
  //   allowedRoles: ["admin", "manager", "user"], // All roles can access notifications
  // },
  {
    name: "Users",
    href: "/dashboard/users",
    icon: Users,
    permission: "users.read",
    allowedRoles: ["admin", "manager"], // Only admin and manager can access user management
  },
  {
    name: "Audit",
    href: "/audit",
    icon: Activity,
    permission: "audit.read",
    allowedRoles: ["admin", "manager"], // Only admin and manager can access audit
  },
  // {
  //   name: "System",
  //   href: "/system",
  //   icon: Settings,
  //   allowedRoles: ["admin"], // Only admin can access system settings
  // },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { user } = useAuth();
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Auto-expand active navigation items
  useEffect(() => {
    const activeItem = navigation.find(
      (item) => item.children && pathname.startsWith(item.href)
    );
    if (activeItem && !expandedItems.includes(activeItem.name)) {
      setExpandedItems((prev) => [...prev, activeItem.name]);
    }
  }, [pathname, expandedItems]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  return (
    <div className="min-h-screen  flex bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <span className="font-semibold text-foreground text-sm sm:text-base">
                Restaurant ERP
              </span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1  overflow-y-auto">
            {navigation
              .filter((item) => {
                // First check role-based access
                if (item.allowedRoles && user?.role) {
                  const hasRoleAccess = item.allowedRoles.includes(user.role);
                  if (!hasRoleAccess) {
                    return false;
                  }
                }

                // Then check permission-based access (if specified)
                if (item.permission) {
                  return hasPermission(user, item.permission);
                }

                return true;
              })
              .map((item) => {
                const isActive = isActiveRoute(item.href);
                const isExpanded = expandedItems.includes(item.name);
                const Icon = item.icon;

                return (
                  <div key={item.name}>
                    <div className="flex items-center">
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                        {item.name === "Notifications" && (
                          <div className="ml-auto">
                            <NotificationBadge />
                          </div>
                        )}
                      </Link>

                      {/* Expand/Collapse button for items with children */}
                      {item.children && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 p-1 h-8 w-8"
                          onClick={() => toggleExpanded(item.name)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Sub-navigation */}
                    {item.children && (isActive || isExpanded) && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <a
                            key={child.name}
                            href={child.href}
                            className={cn(
                              "block px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                              pathname === child.href
                                ? "text-primary bg-primary/10"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                            onClick={() => setSidebarOpen(false)}
                          >
                            {child.name}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.firstName || user?.name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <ModeToggle />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className=" w-full">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-sm font-semibold leading-6 text-foreground">
            Restaurant ERP
          </div>
          <NotificationBadge />
        </div>

        {/* Page content */}
        <main className="flex-1  min-h-[calc(100vh-4rem)] lg:min-h-screen w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
