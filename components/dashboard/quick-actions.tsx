"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  DollarSign,
  Plus,
  BarChart3
} from "lucide-react";

export function QuickActions() {
  const actions = [
    {
      title: "New Sale",
      description: "Record a new sales transaction",
      href: "/sales/pos",
      icon: ShoppingCart,
      variant: "default" as const
    },
    {
      title: "Add Product",
      description: "Add new product to inventory",
      href: "/dashboard/inventory/products?action=create",
      icon: Plus,
      variant: "outline" as const
    },
    {
      title: "Stock Usage",
      description: "Record material usage",
      href: "/dashboard/inventory/usage",
      icon: Package,
      variant: "outline" as const
    },
    {
      title: "Add Cost",
      description: "Record operational expense",
      href: "/costs?action=create",
      icon: DollarSign,
      variant: "outline" as const
    },
    {
      title: "View Analytics",
      description: "Check business insights",
      href: "/analytics",
      icon: BarChart3,
      variant: "outline" as const
    },
    {
      title: "Stock Levels",
      description: "Monitor inventory status",
      href: "/dashboard/inventory/stock-levels",
      icon: TrendingUp,
      variant: "outline" as const
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Button
                  variant={action.variant}
                  className="h-auto p-4 flex flex-col items-center gap-2 w-full"
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}