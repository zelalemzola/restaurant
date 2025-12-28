"use client";

import { useAuth } from "@/lib/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-foreground mb-6">
            Restaurant ERP System
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Comprehensive Enterprise Resource Planning system for restaurant management
          </p>
          
          <div className="flex gap-4 justify-center mb-12">
            <Link href="/login">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg">Create Account</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 border border-border rounded-lg bg-card">
              <h2 className="text-xl font-semibold mb-3">Inventory Management</h2>
              <p className="text-muted-foreground mb-4">
                Track stock levels, manage products, and receive low stock alerts
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg bg-card">
              <h2 className="text-xl font-semibold mb-3">Sales Tracking</h2>
              <p className="text-muted-foreground mb-4">
                Record sales transactions and track payment methods
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg bg-card">
              <h2 className="text-xl font-semibold mb-3">Cost Management</h2>
              <p className="text-muted-foreground mb-4">
                Monitor operational costs and calculate profitability
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg bg-card">
              <h2 className="text-xl font-semibold mb-3">Analytics</h2>
              <p className="text-muted-foreground mb-4">
                View comprehensive reports and business insights
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg bg-card">
              <h2 className="text-xl font-semibold mb-3">Notifications</h2>
              <p className="text-muted-foreground mb-4">
                Stay updated with system alerts and low stock warnings
              </p>
            </div>
            
            <div className="p-6 border border-border rounded-lg bg-card">
              <h2 className="text-xl font-semibold mb-3">Dashboard</h2>
              <p className="text-muted-foreground mb-4">
                Overview of key performance indicators and metrics
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}