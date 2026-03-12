import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Wallet,
  CreditCard,
  Landmark,
  Receipt,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui";
import {
  formatCurrency,
  type WalletView,
  type BalanceSnapshot,
} from "./types";

interface FinanceSummaryCardsProps {
  walletView: WalletView;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  monthlyEssentials: number;
  weeklyBudget: number;
  weeklySpent: number;
  totalDebt: number;
  debtCount: number;
  latestSnapshot: BalanceSnapshot | null;
}

export function FinanceSummaryCards({
  walletView,
  monthlyIncome,
  monthlyExpenses,
  monthlySavings,
  monthlyEssentials,
  weeklyBudget,
  weeklySpent,
  totalDebt,
  debtCount,
  latestSnapshot,
}: FinanceSummaryCardsProps) {
  return (
    <>
      {/* Weekly Budget + Monthly Nut Cards */}
      {walletView !== "debts" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Weekly Discretionary Budget Card */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                This Week&apos;s Budget
              </span>
              <Wallet className="size-4 text-muted-foreground" />
            </div>
            <div className="mb-2 text-[32px] font-bold leading-none text-foreground">
              {formatCurrency(Math.max(0, weeklyBudget - weeklySpent))}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                remaining
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {formatCurrency(weeklySpent)} spent of{" "}
                {formatCurrency(weeklyBudget)}
              </span>
              <span>
                {weeklyBudget > 0
                  ? `${Math.min(100, Math.round((weeklySpent / weeklyBudget) * 100))}%`
                  : "0%"}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, weeklyBudget > 0 ? (weeklySpent / weeklyBudget) * 100 : 0)}%`,
                  backgroundColor:
                    weeklySpent > weeklyBudget ? "#EF4444" : "#22C55E",
                }}
              />
            </div>
            {weeklySpent > weeklyBudget && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#EF4444]">
                <AlertTriangle className="size-3.5" />
                Over budget by {formatCurrency(weeklySpent - weeklyBudget)}
              </div>
            )}
          </div>

          {/* Monthly Nut Card */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Monthly Nut
              </span>
              <Receipt className="size-4 text-muted-foreground" />
            </div>
            <div className="mb-2 text-[32px] font-bold leading-none text-foreground">
              {formatCurrency(monthlyEssentials)}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Essential recurring expenses (housing, utilities, insurance,
              transport, health, debt)
            </p>
            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">vs Income</span>
              <span
                className={cn(
                  "font-medium",
                  monthlyIncome - monthlyEssentials >= 0
                    ? "text-[#22C55E]"
                    : "text-[#EF4444]"
                )}
              >
                {monthlyIncome - monthlyEssentials >= 0 ? "+" : ""}
                {formatCurrency(monthlyIncome - monthlyEssentials)} gap
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Monthly Income"
          value={formatCurrency(monthlyIncome)}
          icon={<TrendingUp className="size-5" />}
        />
        <KpiCard
          label="Monthly Expenses"
          value={formatCurrency(monthlyExpenses)}
          icon={<TrendingDown className="size-5" />}
        />
        <KpiCard
          label="Monthly Savings"
          value={formatCurrency(monthlySavings)}
          subtitle={
            monthlyIncome > 0
              ? `${Math.round((monthlySavings / monthlyIncome) * 100)}% savings rate`
              : undefined
          }
          icon={<DollarSign className="size-5" />}
        />
        {walletView === "debts" ? (
          <KpiCard
            label="Total Debt"
            value={formatCurrency(totalDebt)}
            subtitle={`${debtCount} accounts`}
            icon={<CreditCard className="size-5" />}
          />
        ) : (
          <KpiCard
            label="Net Worth"
            value={formatCurrency(
              latestSnapshot ? Number(latestSnapshot.net_worth ?? 0) : 0
            )}
            subtitle={
              latestSnapshot
                ? `Chq: ${formatCurrency(Number(latestSnapshot.chequing ?? 0))} · Sav: ${formatCurrency(Number(latestSnapshot.savings ?? 0))}`
                : undefined
            }
            icon={<Landmark className="size-5" />}
          />
        )}
      </div>
    </>
  );
}
