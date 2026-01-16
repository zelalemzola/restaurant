"use client";

import { usePathname } from "next/navigation";
import { AppLayout } from "./AppLayout";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const PUBLIC_ROUTES = ["/", "/login", "/register"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Do not show sidebar/navbar on public pages like home and auth
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <ErrorBoundary>
      <AppLayout>{children}</AppLayout>
    </ErrorBoundary>
  );
}






