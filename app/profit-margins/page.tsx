"use client";

import { ProfitMarginAnalysis } from "@/components/costs/ProfitMarginAnalysis";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function ProfitMarginsPage() {
  return (
    <ErrorBoundary>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <ProfitMarginAnalysis />
      </div>
    </ErrorBoundary>
  );
}
