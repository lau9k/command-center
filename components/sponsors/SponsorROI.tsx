"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { SponsorMetricsResponse } from "@/app/api/sponsors/[id]/metrics/route";

const CHART_COLORS = {
  green: "#22C55E",
  blue: "#3B82F6",
} as const;

function formatMonthLabel(month: unknown): string {
  const d = new Date(String(month) + "-01T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

const ROIChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;

      function Chart({ data }: { data: { month: string; amount: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v: number) => formatCurrency(v)}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                labelFormatter={formatMonthLabel}
                formatter={(value: ValueType | undefined) => [
                  formatCurrency(Number(value ?? 0)),
                  "Contribution",
                ]}
              />
              <Bar
                dataKey="amount"
                name="Contribution"
                fill={CHART_COLORS.green}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      return { default: Chart };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
    ),
  },
);

interface SponsorROIProps {
  sponsorId: string;
}

export function SponsorROI({ sponsorId }: SponsorROIProps) {
  const [metrics, setMetrics] = useState<SponsorMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sponsors/${sponsorId}/metrics`);
      if (!res.ok) return;
      const json = await res.json();
      setMetrics(json.data);
    } finally {
      setLoading(false);
    }
  }, [sponsorId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="h-80 animate-pulse rounded-lg border border-border bg-card" />
    );
  }

  if (!metrics || metrics.monthly_values.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-card transition-all duration-150 hover:border-ring/50 hover:shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 p-4 text-left"
      >
        <span className="text-muted-foreground">
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </span>
        <TrendingUp className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Sponsor Value Over Time
        </h3>
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          <ROIChart data={metrics.monthly_values} />
        </div>
      )}
    </div>
  );
}
