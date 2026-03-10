import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/service";
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
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-8 py-16 text-center">
          <Wallet className="size-12 text-muted-foreground/50" />
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-foreground">
              No wallet data yet
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Connect a bank account above or add transactions to start tracking
              your finances.
            </p>
          </div>
          <Link href="/settings">
            <Button className="mt-2 gap-2">
              <Wallet className="size-4" />
              Add Wallet
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
