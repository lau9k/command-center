"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Users,
  Layers,
  FileText,
  Wallet,
} from "lucide-react";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/ui/kpi-card";
import { PeriodComparison } from "@/components/analytics/PeriodComparison";
import type { AnalyticsSummaryResponse } from "@/app/api/analytics/summary/route";

type Period = "7d" | "30d" | "90d";

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "90 Days",
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  if (amount < 0 && Math.abs(amount) >= 1_000)
    return `-$${(Math.abs(amount) / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function formatLabel(s: unknown): string {
  return String(s)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDayLabel(date: unknown): string {
  const d = new Date(String(date) + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(week: unknown): string {
  const d = new Date(String(week) + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatMonthLabel(month: unknown): string {
  const [year, m] = String(month).split("-");
  const d = new Date(Number(year), Number(m) - 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// --- Dynamically loaded chart components (SSR disabled) ---

const TaskCompletionChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        AreaChart,
        Area,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;

      function Chart({
        data,
      }: {
        data: { date: string; count: number }[];
      }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={data}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDayLabel}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                labelFormatter={formatDayLabel}
                formatter={(value: ValueType | undefined) => [
                  value ?? 0,
                  "Completed",
                ]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#22C55E"
                strokeWidth={2}
                fill="url(#taskGrad)"
                dot={false}
                activeDot={{ r: 4, fill: "#22C55E" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      return { default: Chart };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

const PipelineFunnelChart = dynamic(
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

      function Chart({
        data,
      }: {
        data: {
          stage_name: string;
          count: number;
          value: number;
          conversion_rate: number;
        }[];
      }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
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
                dataKey="stage_name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                  fontWeight: 600,
                }}
                formatter={(value: ValueType | undefined) => [
                  value ?? 0,
                  "Deals",
                ]}
              />
              <Bar
                dataKey="count"
                name="Deals"
                fill="#6366f1"
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
      <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

const ContentCadenceChart = dynamic(
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

      function Chart({ data }: { data: { week: string; count: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
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
                dataKey="week"
                tickFormatter={formatWeekLabel}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                labelFormatter={formatWeekLabel}
                formatter={(value: ValueType | undefined) => [
                  value ?? 0,
                  "Posts",
                ]}
              />
              <Bar
                dataKey="count"
                name="Posts"
                fill="#8b5cf6"
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
      <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

const IncomeExpensesChart = dynamic(
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
        Legend,
      } = mod;

      function Chart({
        data,
      }: {
        data: { month: string; income: number; expenses: number }[];
      }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
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
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`
                }
                axisLine={false}
                tickLine={false}
                width={50}
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
                  `$${Number(value ?? 0).toLocaleString()}`,
                ]}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                }}
              />
              <Bar
                dataKey="income"
                name="Income"
                fill="#22C55E"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                fill="#EF4444"
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
      <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

// --- Chart card wrapper ---

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

function NoData({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      No {label} data available
    </div>
  );
}

// --- Loading skeleton ---

function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Cross-module KPIs, charts, and trend visualizations.
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
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}

// --- Main component ---

async function fetchAnalytics(
  period: Period
): Promise<AnalyticsSummaryResponse> {
  const res = await fetch(
    `/api/analytics/summary?period=${period}&compare=true`
  );
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", period],
    queryFn: () => fetchAnalytics(period),
  });

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const { kpis, comparison } = data;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header with period selector */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Cross-module KPIs, charts, and trend visualizations.
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
          label="Total Tasks"
          value={kpis.totalTasks}
          subtitle={`${kpis.completedTasks} completed · ${kpis.overdueTasks} overdue`}
          icon={<CheckCircle2 className="size-5" />}
          accentColor="#22C55E"
          sparkline={
            comparison && (
              <PeriodComparison
                current={comparison.completedTasks.current}
                previous={comparison.completedTasks.previous}
                periodLabel={PERIOD_LABELS[period]}
              />
            )
          }
        />
        <KpiCard
          label="Contacts"
          value={kpis.totalContacts}
          subtitle={`${kpis.newContactsThisMonth} new this month`}
          icon={<Users className="size-5" />}
          accentColor="#3B82F6"
          sparkline={
            comparison && (
              <PeriodComparison
                current={comparison.newContacts.current}
                previous={comparison.newContacts.previous}
                periodLabel={PERIOD_LABELS[period]}
              />
            )
          }
        />
        <KpiCard
          label="Pipeline Deals"
          value={kpis.totalDeals}
          subtitle={`${formatCurrency(kpis.totalDealValue)} total value`}
          icon={<Layers className="size-5" />}
          accentColor="#6366F1"
          sparkline={
            comparison && (
              <PeriodComparison
                current={comparison.newDeals.current}
                previous={comparison.newDeals.previous}
                periodLabel={PERIOD_LABELS[period]}
              />
            )
          }
        />
        <KpiCard
          label="Content Posts"
          value={kpis.totalPosts}
          subtitle={formatLabel(
            data.contentByStatus
              .map((s) => `${s.count} ${s.status}`)
              .join(" · ") || "no posts"
          )}
          icon={<FileText className="size-5" />}
          accentColor="#8B5CF6"
          sparkline={
            comparison && (
              <PeriodComparison
                current={comparison.contentPosts.current}
                previous={comparison.contentPosts.previous}
                periodLabel={PERIOD_LABELS[period]}
              />
            )
          }
        />
        <KpiCard
          label="Net Worth"
          value={formatCurrency(kpis.netWorth)}
          subtitle="income minus expenses"
          icon={<Wallet className="size-5" />}
          accentColor="#F59E0B"
          sparkline={
            comparison && (
              <PeriodComparison
                current={comparison.netIncome.current}
                previous={comparison.netIncome.previous}
                periodLabel={PERIOD_LABELS[period]}
                format="currency"
              />
            )
          }
        />
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Completion Trend */}
        <ChartCard title="Task Completion Trend">
          {data.taskCompletionTrend.length === 0 ? (
            <NoData label="task completion" />
          ) : (
            <TaskCompletionChart data={data.taskCompletionTrend} />
          )}
        </ChartCard>

        {/* Pipeline Funnel */}
        <ChartCard title="Pipeline Funnel">
          {data.pipelineFunnel.length === 0 ? (
            <NoData label="pipeline" />
          ) : (
            <>
              <PipelineFunnelChart data={data.pipelineFunnel} />
              <div className="mt-3 flex flex-wrap gap-3">
                {data.pipelineFunnel.map((stage) => (
                  <div
                    key={stage.stage_name}
                    className="text-xs text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {stage.stage_name}
                    </span>
                    : {stage.count} ({stage.conversion_rate}%) &middot;{" "}
                    {formatCurrency(stage.value)}
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* Content Cadence */}
        <ChartCard title="Content Cadence (Posts / Week)">
          {data.contentCadence.length === 0 ? (
            <NoData label="content" />
          ) : (
            <ContentCadenceChart data={data.contentCadence} />
          )}
        </ChartCard>

        {/* Income vs Expenses */}
        <ChartCard title="Income vs Expenses (Last 3 Months)">
          {data.incomeVsExpenses.length === 0 ? (
            <NoData label="finance" />
          ) : (
            <IncomeExpensesChart data={data.incomeVsExpenses} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
