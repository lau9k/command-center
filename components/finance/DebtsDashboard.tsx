"use client";

import { useMemo } from "react";
import {
  CreditCard,
  TrendingDown,
  Calendar,
  DollarSign,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui";
import type { DebtWithProjections } from "@/lib/types/database";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DebtCard({ debt }: { debt: DebtWithProjections }) {
  const utilizationPct = Math.min(debt.utilization * 100, 100);
  const utilizationColor =
    utilizationPct > 80
      ? "#EF4444"
      : utilizationPct > 50
        ? "#EAB308"
        : "#22C55E";

  return (
    <div className="flex flex-col gap-4 rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#FAFAFA]">{debt.name}</h3>
          <p className="text-xs text-[#A0A0A0]">{debt.lender ?? debt.type}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase",
            debt.type === "loan"
              ? "bg-[#3B82F6]/10 text-[#3B82F6]"
              : debt.type === "credit_line"
                ? "bg-[#A855F7]/10 text-[#A855F7]"
                : "bg-[#22C55E]/10 text-[#22C55E]"
          )}
        >
          {debt.type.replace(/_/g, " ")}
        </span>
      </div>

      {/* Balance */}
      <div>
        <p className="text-2xl font-bold text-[#EF4444]">
          {formatCurrencyFull(Number(debt.balance))}
        </p>
        <p className="text-xs text-[#A0A0A0]">
          of {formatCurrencyFull(Number(debt.principal))} principal
        </p>
      </div>

      {/* Utilization bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-[#A0A0A0]">Utilization</span>
          <span style={{ color: utilizationColor }}>
            {utilizationPct.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#2A2A2A]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${utilizationPct}%`,
              backgroundColor: utilizationColor,
            }}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] uppercase text-[#666666]">Rate</p>
          <p className="text-sm font-medium text-[#FAFAFA]">
            {debt.interest_rate != null ? `${debt.interest_rate}%` : "0%"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#666666]">Min Payment</p>
          <p className="text-sm font-medium text-[#FAFAFA]">
            {debt.min_payment != null
              ? formatCurrencyFull(Number(debt.min_payment))
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#666666]">Next Due</p>
          <p className="text-sm font-medium text-[#FAFAFA]">
            {debt.nextDueDate ? formatDate(debt.nextDueDate) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-[#666666]">Payoff Date</p>
          <p className="text-sm font-medium text-[#FAFAFA]">
            {debt.projection.projectedPayoffDate
              ? formatDate(debt.projection.projectedPayoffDate)
              : "Never"}
          </p>
        </div>
      </div>

      {/* Monthly interest */}
      <div className="border-t border-[#2A2A2A] pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#A0A0A0]">Monthly Interest</span>
          <span className="font-medium text-[#EF4444]">
            {formatCurrencyFull(debt.projection.monthlyInterestCost)}
          </span>
        </div>
        {debt.projection.monthsToPayoff != null && (
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-[#A0A0A0]">Months to Payoff</span>
            <span className="font-medium text-[#FAFAFA]">
              {debt.projection.monthsToPayoff}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DebtsDashboardProps {
  debts: DebtWithProjections[];
}

export function DebtsDashboard({ debts }: DebtsDashboardProps) {
  const summary = useMemo(() => {
    const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
    const totalMinimums = debts.reduce(
      (s, d) => s + Number(d.min_payment ?? 0),
      0
    );
    const monthlyInterest = debts.reduce(
      (s, d) => s + d.projection.monthlyInterestCost,
      0
    );

    // Weighted average rate by balance
    const weightedRateSum = debts.reduce(
      (s, d) => s + Number(d.interest_rate ?? 0) * Number(d.balance),
      0
    );
    const weightedAvgRate = totalDebt > 0 ? weightedRateSum / totalDebt : 0;

    return { totalDebt, totalMinimums, monthlyInterest, weightedAvgRate };
  }, [debts]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Debt"
          value={formatCurrency(summary.totalDebt)}
          subtitle={`${debts.length} accounts`}
          icon={<CreditCard className="size-5" />}
        />
        <KpiCard
          label="Total Minimums"
          value={formatCurrency(summary.totalMinimums)}
          subtitle="Monthly payment"
          icon={<DollarSign className="size-5" />}
        />
        <KpiCard
          label="Weighted Avg Rate"
          value={`${summary.weightedAvgRate.toFixed(1)}%`}
          subtitle="By balance"
          icon={<Percent className="size-5" />}
        />
        <KpiCard
          label="Monthly Interest"
          value={formatCurrency(summary.monthlyInterest)}
          subtitle="Cost of debt"
          icon={<TrendingDown className="size-5" />}
        />
      </div>

      {/* Debt Card Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {debts.map((debt) => (
          <DebtCard key={debt.id} debt={debt} />
        ))}
      </div>

      {debts.length === 0 && (
        <div className="rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-12 text-center">
          <CreditCard className="mx-auto mb-3 size-8 text-[#666666]" />
          <p className="text-sm text-[#A0A0A0]">No debt instruments found</p>
        </div>
      )}
    </div>
  );
}
