"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHome?: boolean;
  maxItems?: number;
}

// Route mapping for better breadcrumb labels
const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  inventory: "Inventory",
  "stock-levels": "Stock Levels",
  products: "Products",
  groups: "Product Groups",
  usage: "Usage Tracking",
  sales: "Sales",
  pos: "Point of Sale",
  transactions: "Transactions",
  costs: "Cost Management",
  analytics: "Analytics",
  notifications: "Notifications",
  users: "User Management",
  system: "System Settings",
};

function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [];

  let currentPath = "";

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Skip dynamic route segments (those starting with [ or containing special chars)
    if (segment.startsWith("[") || segment.includes("?")) {
      return;
    }

    const label =
      routeLabels[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbs.push({
      label,
      href: currentPath,
    });
  });

  return breadcrumbs;
}

export function Breadcrumb({
  items,
  className,
  showHome = true,
  maxItems = 5,
}: BreadcrumbProps) {
  const pathname = usePathname();

  // Use provided items or generate from current path
  const breadcrumbItems = items || generateBreadcrumbsFromPath(pathname);

  // Limit the number of items shown
  const displayItems =
    breadcrumbItems.length > maxItems
      ? [
          ...breadcrumbItems.slice(0, 1),
          { label: "...", href: "#", icon: null },
          ...breadcrumbItems.slice(-maxItems + 2),
        ]
      : breadcrumbItems;

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className
      )}
    >
      {showHome && (
        <>
          <Link
            href="/dashboard"
            className="flex items-center hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Dashboard</span>
          </Link>
          {breadcrumbItems.length > 0 && <ChevronRight className="h-4 w-4" />}
        </>
      )}

      {displayItems.map((item, index) => (
        <div key={`${item.href}-${index}`} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}

          {index === displayItems.length - 1 ? (
            // Current page - not clickable
            <span className="flex items-center gap-1 font-medium text-foreground">
              {item.icon}
              {item.label}
            </span>
          ) : item.label === "..." ? (
            // Ellipsis - not clickable
            <span className="px-1">...</span>
          ) : (
            // Clickable breadcrumb
            <Link
              href={item.href}
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              {item.icon}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

// Specialized breadcrumb for specific sections
interface SectionBreadcrumbProps {
  section: "inventory" | "sales" | "costs" | "analytics" | "system";
  currentPage?: string;
  className?: string;
}

export function SectionBreadcrumb({
  section,
  currentPage,
  className,
}: SectionBreadcrumbProps) {
  const sectionConfig = {
    inventory: {
      label: "Inventory Management",
      href: "/dashboard/inventory",
      icon: <Home className="h-4 w-4" />,
    },
    sales: {
      label: "Sales Management",
      href: "/sales",
      icon: <Home className="h-4 w-4" />,
    },
    costs: {
      label: "Cost Management",
      href: "/costs",
      icon: <Home className="h-4 w-4" />,
    },
    analytics: {
      label: "Analytics",
      href: "/analytics",
      icon: <Home className="h-4 w-4" />,
    },
    system: {
      label: "System Settings",
      href: "/system",
      icon: <Home className="h-4 w-4" />,
    },
  };

  const config = sectionConfig[section];

  const items: BreadcrumbItem[] = [
    {
      label: config.label,
      href: config.href,
      icon: config.icon,
    },
  ];

  if (currentPage) {
    items.push({
      label: currentPage,
      href: "#",
    });
  }

  return <Breadcrumb items={items} className={className} />;
}
