"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
}

export function Loading({ size = "md", text, className }: LoadingProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
        {text && (
          <p className={cn(
            "text-muted-foreground text-center",
            size === "xs" || size === "sm" ? "text-xs" : "text-sm"
          )}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size], className)} />
  );
}

export function LoadingPage({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Loading size="xl" text={text} />
    </div>
  );
}

export function LoadingCard({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center p-6 sm:p-8">
      <Loading size="md" text={text} />
    </div>
  );
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/6"></div>
        </div>
      ))}
    </div>
  );
}

export function LoadingButton({ 
  children, 
  isLoading, 
  size = "sm",
  ...props 
}: { 
  children: React.ReactNode; 
  isLoading: boolean; 
  size?: "xs" | "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button disabled={isLoading} {...props}>
      <div className="flex items-center space-x-2">
        {isLoading && <LoadingSpinner size={size} />}
        <span>{children}</span>
      </div>
    </button>
  );
}

export function LoadingSkeleton({ 
  className,
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}