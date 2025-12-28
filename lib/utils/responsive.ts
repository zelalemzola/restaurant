"use client";

import { useEffect, useState } from "react";

// Breakpoint definitions (matching Tailwind CSS)
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Hook to get current screen size
export function useScreenSize() {
  const [screenSize, setScreenSize] = useState<{
    width: number;
    height: number;
    breakpoint: Breakpoint | "xs";
  }>({
    width: 0,
    height: 0,
    breakpoint: "xs",
  });

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      let breakpoint: Breakpoint | "xs" = "xs";
      if (width >= breakpoints["2xl"]) breakpoint = "2xl";
      else if (width >= breakpoints.xl) breakpoint = "xl";
      else if (width >= breakpoints.lg) breakpoint = "lg";
      else if (width >= breakpoints.md) breakpoint = "md";
      else if (width >= breakpoints.sm) breakpoint = "sm";

      setScreenSize({ width, height, breakpoint });
    };

    // Set initial size
    updateScreenSize();

    // Add event listener
    window.addEventListener("resize", updateScreenSize);

    // Cleanup
    return () => window.removeEventListener("resize", updateScreenSize);
  }, []);

  return screenSize;
}

// Hook to check if screen is at or above a breakpoint
export function useMediaQuery(breakpoint: Breakpoint) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      `(min-width: ${breakpoints[breakpoint]}px)`
    );

    const updateMatches = () => setMatches(mediaQuery.matches);
    updateMatches();

    mediaQuery.addEventListener("change", updateMatches);
    return () => mediaQuery.removeEventListener("change", updateMatches);
  }, [breakpoint]);

  return matches;
}

// Hook for mobile detection
export function useIsMobile() {
  return !useMediaQuery("md");
}

// Hook for tablet detection
export function useIsTablet() {
  const isMd = useMediaQuery("md");
  const isLg = useMediaQuery("lg");
  return isMd && !isLg;
}

// Hook for desktop detection
export function useIsDesktop() {
  return useMediaQuery("lg");
}

// Responsive value hook - returns different values based on screen size
export function useResponsiveValue<T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  "2xl"?: T;
}) {
  const { breakpoint } = useScreenSize();

  // Find the appropriate value based on current breakpoint
  const breakpointOrder: (Breakpoint | "xs")[] = [
    "2xl",
    "xl",
    "lg",
    "md",
    "sm",
    "xs",
  ];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return values.xs;
}

// Utility to generate responsive classes
export function generateResponsiveClasses(
  baseClass: string,
  responsive: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    "2xl"?: string;
  }
) {
  const classes = [baseClass];

  Object.entries(responsive).forEach(([breakpoint, value]) => {
    if (value) {
      classes.push(`${breakpoint}:${value}`);
    }
  });

  return classes.join(" ");
}

// Responsive grid columns utility
export function getResponsiveGridCols(cols: {
  default?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  "2xl"?: number;
}) {
  const classes = [];

  if (cols.default) classes.push(`grid-cols-${cols.default}`);
  if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
  if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
  if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
  if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
  if (cols["2xl"]) classes.push(`2xl:grid-cols-${cols["2xl"]}`);

  return classes.join(" ");
}

// Responsive gap utility
export function getResponsiveGap(gap: {
  default?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  "2xl"?: string;
}) {
  const classes = [];

  if (gap.default) classes.push(`gap-${gap.default}`);
  if (gap.sm) classes.push(`sm:gap-${gap.sm}`);
  if (gap.md) classes.push(`md:gap-${gap.md}`);
  if (gap.lg) classes.push(`lg:gap-${gap.lg}`);
  if (gap.xl) classes.push(`xl:gap-${gap.xl}`);
  if (gap["2xl"]) classes.push(`2xl:gap-${gap["2xl"]}`);

  return classes.join(" ");
}

// Responsive padding utility
export function getResponsivePadding(padding: {
  default?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  "2xl"?: string;
}) {
  const classes = [];

  if (padding.default) classes.push(`p-${padding.default}`);
  if (padding.sm) classes.push(`sm:p-${padding.sm}`);
  if (padding.md) classes.push(`md:p-${padding.md}`);
  if (padding.lg) classes.push(`lg:p-${padding.lg}`);
  if (padding.xl) classes.push(`xl:p-${padding.xl}`);
  if (padding["2xl"]) classes.push(`2xl:p-${padding["2xl"]}`);

  return classes.join(" ");
}

// Touch device detection
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        "ontouchstart" in window ||
          navigator.maxTouchPoints > 0 ||
          // @ts-ignore
          navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}

// Orientation detection
export function useOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait"
  );

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? "portrait" : "landscape"
      );
    };

    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);

    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  return orientation;
}

// Viewport height hook (useful for mobile browsers)
export function useViewportHeight() {
  const [vh, setVh] = useState(0);

  useEffect(() => {
    const updateVh = () => {
      setVh(window.innerHeight * 0.01);
      document.documentElement.style.setProperty(
        "--vh",
        `${window.innerHeight * 0.01}px`
      );
    };

    updateVh();
    window.addEventListener("resize", updateVh);
    window.addEventListener("orientationchange", updateVh);

    return () => {
      window.removeEventListener("resize", updateVh);
      window.removeEventListener("orientationchange", updateVh);
    };
  }, []);

  return vh;
}
