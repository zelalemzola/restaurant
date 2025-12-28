"use client";

import { useAuth } from "@/lib/providers/AuthProvider";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { NotificationBadge } from "@/components/ui/notification-badge";

interface DashboardHeaderProps {
  title: string;
  description?: string;
}

export function DashboardHeader({ title, description }: DashboardHeaderProps) {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <NotificationBadge />
        <div className="text-sm text-muted-foreground mr-2">
          {user?.firstName || user?.name || user?.email}
        </div>
        <Button onClick={handleSignOut} variant="outline">
          Sign Out
        </Button>
      </div>
    </div>
  );
}