"use client";

import { useViewportHeight } from "@/lib/utils/responsive";

interface ViewportHeightProviderProps {
  children: React.ReactNode;
}

export function ViewportHeightProvider({ children }: ViewportHeightProviderProps) {
  // This hook sets the CSS custom property --vh for mobile viewport height
  useViewportHeight();
  
  return <>{children}</>;
}