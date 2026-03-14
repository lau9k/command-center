"use client";

import dynamic from "next/dynamic";
import {
  PageSkeleton,
  KPIStripSkeleton,
} from "@/components/dashboard/LoadingSkeleton";
import type { CryptoBalance, BalanceSnapshot } from "@/lib/types/database";

const TreasuryDashboard = dynamic(
  () =>
    import("@/components/finance/TreasuryDashboard").then(
      (mod) => mod.TreasuryDashboard
    ),
  {
    ssr: false,
    loading: () => (
      <PageSkeleton>
        <KPIStripSkeleton count={4} />
      </PageSkeleton>
    ),
  }
);

interface Props {
  holdings: CryptoBalance[];
  snapshots: BalanceSnapshot[];
}

export function TreasuryDashboardLazy(props: Props) {
  return <TreasuryDashboard {...props} />;
}
