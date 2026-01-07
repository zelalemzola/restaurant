"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { ProfitMarginAnalysis } from "@/components/costs/ProfitMarginAnalysis";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function ProfitMarginsPage() {
  return (
    <ErrorBoundary>
      <AppLayout>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <ProfitMarginAnalysis />
        </div>
      </AppLayout>
    </ErrorBoundary>
  );
}
