import { createServiceClient } from "@/lib/supabase/service";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track income, expenses, debts, and net worth
        </p>
      </div>

      <div className="mb-6">
        <ConnectedAccounts />
      </div>

      <FinanceDashboard
        transactions={(transactionsRes.data as Transaction[]) ?? []}
        debts={(debtsRes.data as Debt[]) ?? []}
        snapshots={(snapshotsRes.data as BalanceSnapshot[]) ?? []}
        reimbursementRequests={
          (reimbursementRequestsRes.data as ReimbursementRequest[]) ?? []
        }
      />
    </div>
  );
}
