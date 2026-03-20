import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export interface FinanceSummaryResponse {
  netWorth: number | null;
  chequing: number | null;
  totalDebt: number | null;
  monthlyExpenses: number;
  monthlyIncome: number;
  monthlyBurn: number;
  previousNetWorth: number | null;
  sparklineData: { date: string; netWorth: number }[];
}

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [latestSnapshotRes, sparklineRes, expensesRes, incomeRes] =
    await Promise.all([
      // Latest balance snapshot
      supabase
        .from("balance_snapshots")
        .select("net_worth, chequing, total_debt, snapshot_date")
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),

      // Last 6 snapshots for sparkline
      supabase
        .from("balance_snapshots")
        .select("snapshot_date, net_worth")
        .order("snapshot_date", { ascending: false })
        .limit(6),

      // Monthly expenses
      supabase
        .from("transactions")
        .select("amount")
        .eq("type", "expense")
        .gte("date", monthStart)
        .lte("date", monthEnd),

      // Monthly income
      supabase
        .from("transactions")
        .select("amount")
        .eq("type", "income")
        .gte("date", monthStart)
        .lte("date", monthEnd),
    ]);

  if (latestSnapshotRes.error) {
    return NextResponse.json(
      { error: latestSnapshotRes.error.message },
      { status: 500 }
    );
  }

  const latest = latestSnapshotRes.data;
  const sparklineRows = (sparklineRes.data ?? []) as {
    snapshot_date: string;
    net_worth: number | null;
  }[];

  // Previous snapshot for trend comparison (second most recent)
  const previousNetWorth =
    sparklineRows.length >= 2 ? (sparklineRows[1].net_worth ?? null) : null;

  const monthlyExpenses = (expensesRes.data ?? []).reduce(
    (sum: number, row: { amount: number | null }) =>
      sum + Math.abs(Number(row.amount ?? 0)),
    0
  );

  const monthlyIncome = (incomeRes.data ?? []).reduce(
    (sum: number, row: { amount: number | null }) =>
      sum + Math.abs(Number(row.amount ?? 0)),
    0
  );

  const response: FinanceSummaryResponse = {
    netWorth: latest?.net_worth ?? null,
    chequing: latest?.chequing ?? null,
    totalDebt: latest?.total_debt ?? null,
    monthlyExpenses,
    monthlyIncome,
    monthlyBurn: monthlyExpenses - monthlyIncome,
    previousNetWorth,
    sparklineData: sparklineRows
      .filter(
        (r): r is { snapshot_date: string; net_worth: number } =>
          r.net_worth !== null
      )
      .reverse()
      .map((r) => ({
        date: r.snapshot_date,
        netWorth: r.net_worth,
      })),
  };

  return NextResponse.json({ data: response });
});
