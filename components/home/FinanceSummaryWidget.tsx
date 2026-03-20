"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Wallet,
  CreditCard,
  TrendingDown,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";
import type { FinanceSummaryResponse } from "@/app/api/finance/summary/route";

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

type TrendDirection = "up" | "down" | null;

function getTrend(
  current: number | null,
  previous: number | null
): { direction: TrendDirection; pct: number } {
  if (current === null || previous === null || previous === 0)
    return { direction: null, pct: 0 };
  const pct = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (pct === 0) return { direction: null, pct: 0 };
  return { direction: pct > 0 ? "up" : "down", pct: Math.abs(pct) };
}

export function FinanceSummaryWidget() {
  const [data, setData] = useState<FinanceSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finance/summary")
      .then((res) => res.json())
      .then((json: { data: FinanceSummaryResponse }) => setData(json.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-border bg-card p-6">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="mt-4 h-8 w-48 rounded bg-muted" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!data || data.netWorth === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground">
          Finance Summary
        </h2>
        <div className="mt-6 flex flex-col items-center gap-2 py-4">
          <DollarSign className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Set up finance tracking
          </p>
          <Link
            href="/finance"
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to Finance →
          </Link>
        </div>
      </div>
    );
  }

  const trend = getTrend(data.netWorth, data.previousNetWorth);

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Finance Summary
        </h2>
        <Link
          href="/finance"
          className="text-xs font-medium text-primary hover:underline"
        >
          View Finance →
        </Link>
      </div>

      {/* Primary: Net Worth + Sparkline */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Net Worth</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(data.netWorth)}
            </span>
            {trend.direction && (
              <span
                className={`inline-flex items-center gap-0.5 text-sm font-medium ${
                  trend.direction === "up"
                    ? "text-[#22C55E]"
                    : "text-[#EF4444]"
                }`}
              >
                {trend.direction === "up" ? (
                  <ArrowUpRight className="size-4" />
                ) : (
                  <ArrowDownRight className="size-4" />
                )}
                {trend.pct}%
              </span>
            )}
          </div>
        </div>

        {data.sparklineData.length >= 2 && (
          <div className="shrink-0">
            <ResponsiveContainer width={100} height={40}>
              <AreaChart
                data={data.sparklineData}
                margin={{ top: 2, right: 0, left: 0, bottom: 2 }}
              >
                <defs>
                  <linearGradient
                    id="finance-spark"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#22C55E"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="#22C55E"
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#22C55E"
                  strokeWidth={1.5}
                  fill="url(#finance-spark)"
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Secondary metrics */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Wallet className="size-3.5" />
            Cash
          </div>
          <p className="mt-0.5 text-lg font-semibold text-foreground">
            {formatCurrency(data.chequing)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CreditCard className="size-3.5" />
            Debt
          </div>
          <p className="mt-0.5 text-lg font-semibold text-foreground">
            {formatCurrency(data.totalDebt)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingDown className="size-3.5" />
            Burn
          </div>
          <p className="mt-0.5 text-lg font-semibold text-foreground">
            {formatCurrency(data.monthlyBurn)}
            <span className="text-xs font-normal text-muted-foreground">
              /mo
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
