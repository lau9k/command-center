"use client";

import dynamic from "next/dynamic";
import { FinanceSkeleton } from "@/components/dashboard/LoadingSkeleton";

const FinanceDashboard = dynamic(
  () =>
    import("@/components/finance/FinanceDashboard").then(
      (mod) => mod.FinanceDashboard
    ),
  { ssr: false, loading: () => <FinanceSkeleton /> }
);

export function FinanceDashboardLazy() {
  return <FinanceDashboard />;
}
