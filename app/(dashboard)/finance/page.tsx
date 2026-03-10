import { createServiceClient } from "@/lib/supabase/service";
import { FinanceEmptyState } from "./FinanceEmptyState";
import { FinanceDashboardLazy } from "@/components/finance/FinanceDashboardLazy";
import { ConnectedAccounts } from "@/components/finance/ConnectedAccounts";
import type {
  Transaction,
  Debt,
  BalanceSnapshot,
  ReimbursementRequest,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const supabase = createServiceClient();

  const [transactionsRes, debtsRes, snapshotsRes, reimbursementRequestsRes] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("debts")
        .select("*")
        .order("balance", { ascending: false }),
      supabase
        .from("balance_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: false })
        .limit(12),
      supabase
        .from("reimbursement_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const transactions = (transactionsRes.data as Transaction[]) ?? [];
  const debts = (debtsRes.data as Debt[]) ?? [];
  const snapshots = (snapshotsRes.data as BalanceSnapshot[]) ?? [];
  const reimbursementRequests =
    (reimbursementRequestsRes.data as ReimbursementRequest[]) ?? [];

  const hasData =
    transactions.length > 0 || debts.length > 0 || snapshots.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track income, expenses, debts, and net worth
        </p>
      </div>

      <ConnectedAccounts />

      {hasData ? (
        <FinanceDashboardLazy
          transactions={transactions}
          debts={debts}
          snapshots={snapshots}
          reimbursementRequests={reimbursementRequests}
        />
      ) : (
        <FinanceEmptyState />
      )}
    </div>
  );
}
