"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import {
  TrendingUp,
  Target,
  DollarSign,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui/kpi-card";
import { PipelineFunnel } from "@/components/analytics/PipelineFunnel";
import { TrendCharts } from "@/components/analytics/TrendCharts";

interface AnalyticsData {
  sponsorsByTier: { tier: string; count: number }[];
  sponsorsByStatus: { status: string; count: number }[];
  contentByPlatform: { platform: string; count: number }[];
  tasksByStatus: { status: string; count: number }[];
  tasksByProject: { project: string; count: number }[];
  pipelineByWeek: { week: string; count: number; value: number }[];
  tasksCompletedByWeek: { week: string; count: number }[];
  contentByWeek: { week: string; count: number }[];
  contactsByWeek: { week: string; count: number }[];
  pipelineFunnel: {
    stage_name: string;
    count: number;
    value: number;
    conversion_rate: number;
  }[];
  kpi: {
    totalDeals: number;
    winRate: number;
    avgDealSize: number;
    tasksPerWeek: number;
    contentPerWeek: number;
  };
}

type Period = "7d" | "30d" | "90d";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
};

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#818cf8",
  "#7c3aed",
  "#4f46e5",
  "#6d28d9",
];

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
  title: "#6366f1",
};

function formatLabel(s: unknown): string {
  return String(s)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("30d");

  const fetchData = useCallback((p: Period) => {
    setLoading(true);
    fetch(`/api/analytics?period=${p}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Charts and trend visualizations across all modules.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 p-6">
        <p className="text-muted-foreground">Failed to load analytics data.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header with period selector */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Charts and trend visualizations across all modules.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === p
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Total Deals"
          value={data.kpi.totalDeals}
          icon={<TrendingUp className="size-5" />}
        />
        <KpiCard
          label="Win Rate"
          value={`${data.kpi.winRate}%`}
          icon={<Target className="size-5" />}
        />
        <KpiCard
          label="Avg Deal Size"
          value={formatCurrency(data.kpi.avgDealSize)}
          icon={<DollarSign className="size-5" />}
        />
        <KpiCard
          label="Tasks / Week"
          value={data.kpi.tasksPerWeek}
          icon={<CheckCircle2 className="size-5" />}
        />
        <KpiCard
          label="Content / Week"
          value={data.kpi.contentPerWeek}
          icon={<FileText className="size-5" />}
        />
      </div>

      {/* Pipeline Funnel */}
      <ChartCard title="Pipeline Conversion Funnel">
        <PipelineFunnel data={data.pipelineFunnel} />
      </ChartCard>

      {/* Trend Charts */}
      <TrendCharts
        tasksCompleted={data.tasksCompletedByWeek}
        contentPublished={data.contentByWeek}
        contactsAdded={data.contactsByWeek}
        pipelineDeals={data.pipelineByWeek}
      />

      {/* Existing breakdown charts */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Sponsors by Tier */}
        <ChartCard title="Sponsors by Tier">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.sponsorsByTier}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="tier"
                tickFormatter={formatLabel}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
                labelFormatter={formatLabel}
              />
              <Bar dataKey="count" name="Sponsors" radius={[4, 4, 0, 0]}>
                {data.sponsorsByTier.map((entry) => (
                  <Cell
                    key={entry.tier}
                    fill={TIER_COLORS[entry.tier] || COLORS[0]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sponsors by Status */}
        <ChartCard title="Sponsors by Status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.sponsorsByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) =>
                  `${formatLabel(name)}: ${value}`
                }
              >
                {data.sponsorsByStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
                formatter={(value: ValueType | undefined) => [value ?? 0, "Count"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Content by Platform */}
        <ChartCard title="Content by Platform">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.contentByPlatform}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="platform"
                tickFormatter={formatLabel}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
                labelFormatter={formatLabel}
              />
              <Bar
                dataKey="count"
                name="Posts"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tasks by Status */}
        <ChartCard title="Tasks by Status">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data.tasksByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) =>
                  `${formatLabel(name)}: ${value}`
                }
              >
                {data.tasksByStatus.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
                formatter={(value: ValueType | undefined) => [value ?? 0, "Count"]}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Tasks by Project */}
        <ChartCard title="Tasks by Project">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data.tasksByProject}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                type="category"
                dataKey="project"
                width={120}
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                }}
              />
              <Bar
                dataKey="count"
                name="Tasks"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}
