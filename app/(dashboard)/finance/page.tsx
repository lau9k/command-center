import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata: Metadata = { title: "Finance" };
import { createServiceClient } from "@/lib/supabase/service";
import { FinanceEmptyState } from "./FinanceEmptyState";
import { FinanceDashboardLazy } from "@/components/finance/FinanceDashboardLazy";
import { ConnectedAccounts } from "@/components/finance/ConnectedAccounts";
import { PlaidConnectBanner } from "@/components/finance/PlaidConnectBanner";
import { PlaidSyncButton } from "@/components/finance/PlaidSyncButton";
import { ImportCsvButton } from "@/components/finance/ImportCsvButton";
import { getQueryClient } from "@/lib/query-client";
import type {
  Transaction,
  Debt,
  BalanceSnapshot,
  ReimbursementRequest,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["finance", "transactions"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("[Finance] transactions query error:", error.message);
          return [];
        }
        return (data as Transaction[]) ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["finance", "debts"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("debts")
          .select("*")
          .order("balance", { ascending: false });
        if (error) {
          console.error("[Finance] debts query error:", error.message);
          return [];
        }
        return (data as Debt[]) ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["finance", "snapshots"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("balance_snapshots")
          .select("*")
          .order("snapshot_date", { ascending: false })
          .limit(12);
        if (error) {
          console.error("[Finance] snapshots query error:", error.message);
          return [];
        }
        return (data as BalanceSnapshot[]) ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["finance", "reimbursements"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("reimbursement_requests")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) {
          console.error("[Finance] reimbursements query error:", error.message);
          return [];
        }
        return (data as ReimbursementRequest[]) ?? [];
      },
    }),
  ]);

  const transactions =
    queryClient.getQueryData<Transaction[]>(["finance", "transactions"]) ?? [];
  const debts =
    queryClient.getQueryData<Debt[]>(["finance", "debts"]) ?? [];
  const snapshots =
    queryClient.getQueryData<BalanceSnapshot[]>(["finance", "snapshots"]) ?? [];

  const plaidConfigured = !!(
    process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET
  );

  let plaidStatus: "not_configured" | "configured_not_linked" | "connected" =
    "not_configured";

  if (plaidConfigured) {
    const { count: plaidItemCount } = await supabase
      .from("plaid_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    plaidStatus =
      (plaidItemCount ?? 0) > 0 ? "connected" : "configured_not_linked";
  }

  const hasData =
    transactions.length > 0 || debts.length > 0 || snapshots.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track income, expenses, debts, and net worth
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportCsvButton />
          {plaidStatus === "connected" && <PlaidSyncButton />}
        </div>
      </div>

      {plaidStatus !== "connected" && (
        <PlaidConnectBanner status={plaidStatus} />
      )}

      {plaidStatus === "connected" && <ConnectedAccounts />}

      <HydrationBoundary state={dehydrate(queryClient)}>
        {hasData ? <FinanceDashboardLazy /> : <FinanceEmptyState />}
      </HydrationBoundary>
    </div>
  );
}
