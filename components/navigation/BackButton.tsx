"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  fallbackPath?: string;
  showText?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  text?: string;
}

export function BackButton({
  fallbackPath = "/dashboard",
  showText = true,
  className,
  variant = "outline",
  size = "default",
  text = "Back",
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Check if there's history to go back to
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      // Fallback to specified path or dashboard
      router.push(fallbackPath);
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant={variant}
      size={size}
      className={cn("flex items-center gap-2", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      {showText && size !== "icon" && <span>{text}</span>}
    </Button>
  );
}

interface HomeBreadcrumbProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export function HomeBreadcrumb({
  className,
  variant = "ghost",
  size = "sm",
}: HomeBreadcrumbProps) {
  const router = useRouter();

  const handleHome = () => {
    router.push("/dashboard");
  };

  return (
    <Button
      onClick={handleHome}
      variant={variant}
      size={size}
      className={cn("flex items-center gap-2", className)}
    >
      <Home className="h-4 w-4" />
      <span>Dashboard</span>
    </Button>
  );
}
