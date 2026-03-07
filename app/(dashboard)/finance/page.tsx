import { createClient } from "@/lib/supabase/server";
import { FinanceDashboard } from "@/components/finance/FinanceDashboard";
import type {
  Transaction,
  Debt,
  BalanceSnapshot,
  ReimbursementRequest,
} from "@/lib/types/database";

export default async function FinancePage() {
  const supabase = await createClient();

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
        .neq("status", "paid")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#FAFAFA]">Finance</h1>
        <p className="mt-1 text-sm text-[#A0A0A0]">
          Track income, expenses, debts, and net worth
        </p>
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
