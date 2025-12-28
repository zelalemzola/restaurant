"use client";

import { cn } from "@/lib/utils";

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
}

export function ResponsiveContainer({ 
  children, 
  className, 
  size = "xl",
  padding = "md"
}: ResponsiveContainerProps) {
  const sizeClasses = {
    sm: "max-w-2xl",
    md: "max-w-4xl", 
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-none"
  };

  const paddingClasses = {
    none: "",
    sm: "px-4 py-4 sm:px-6 sm:py-6",
    md: "px-4 py-6 sm:px-6 sm:py-8 lg:px-8",
    lg: "px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16"
  };

  return (
    <div className={cn(
      "container mx-auto w-full",
      sizeClasses[size],
      paddingClasses[padding],
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    "2xl"?: number;
  };
  gap?: "none" | "sm" | "md" | "lg" | "xl";
}

export function ResponsiveGrid({ 
  children, 
  className,
  cols = { default: 1, md: 2, lg: 3 },
  gap = "md"
}: ResponsiveGridProps) {
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2 sm:gap-3",
    md: "gap-4 sm:gap-6",
    lg: "gap-6 sm:gap-8",
    xl: "gap-8 sm:gap-12"
  };

  const getGridCols = () => {
    const classes = [];
    
    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    if (cols["2xl"]) classes.push(`2xl:grid-cols-${cols["2xl"]}`);
    
    return classes.join(" ");
  };

  return (
    <div className={cn(
      "grid",
      getGridCols(),
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
}

interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: "vertical" | "horizontal" | "responsive";
  gap?: "none" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
}

export function ResponsiveStack({
  children,
  className,
  direction = "vertical",
  gap = "md",
  align = "stretch",
  justify = "start"
}: ResponsiveStackProps) {
  const gapClasses = {
    none: "gap-0",
    sm: "gap-2",
    md: "gap-4",
    lg: "gap-6",
    xl: "gap-8"
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center", 
    end: "items-end",
    stretch: "items-stretch"
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly"
  };

  const directionClasses = {
    vertical: "flex-col",
    horizontal: "flex-row",
    responsive: "flex-col sm:flex-row"
  };

  return (
    <div className={cn(
      "flex",
      directionClasses[direction],
      gapClasses[gap],
      alignClasses[align],
      justifyClasses[justify],
      className
    )}>
      {children}
    </div>
  );
}