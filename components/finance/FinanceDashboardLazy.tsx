"use client";

import dynamic from "next/dynamic";
import { FinanceSkeleton } from "@/components/dashboard/LoadingSkeleton";
import type {
  Transaction,
  Debt,
  BalanceSnapshot,
  ReimbursementRequest,
} from "@/lib/types/database";

const FinanceDashboard = dynamic(
  () =>
    import("@/components/finance/FinanceDashboard").then(
      (mod) => mod.FinanceDashboard
    ),
  { ssr: false, loading: () => <FinanceSkeleton /> }
);

interface Props {
  transactions: Transaction[];
  debts: Debt[];
  snapshots: BalanceSnapshot[];
  reimbursementRequests: ReimbursementRequest[];
}

export function FinanceDashboardLazy(props: Props) {
  return <FinanceDashboard {...props} />;
}
