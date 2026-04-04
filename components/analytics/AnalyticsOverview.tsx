"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Users,
  Layers,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Activity,
  Clock,
} from "lucide-react";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { AnalyticsOverviewResponse } from "@/app/api/analytics/overview/route";

const CHART_COLORS = {
  green: "#22C55E",
  blue: "#3B82F6",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  red: "#EF4444",
  amber: "#F59E0B",
} as const;

function formatWeekLabel(week: unknown): string {
  const d = new Date(String(week) + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

// --- Dynamically loaded chart components (SSR disabled) ---

const ContactsGrowthChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } =
        mod;

      function Chart({ data }: { data: { week: string; count: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
                formatter={(value: ValueType | undefined) => [value ?? 0, "New Contacts"]}
              />
              <Bar
                dataKey="count"
                name="New Contacts"
                fill={CHART_COLORS.blue}
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
    loading: () => <div className="h-[260px] animate-pulse rounded-lg bg-muted" />,
  }
);

const PipelineByStageChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } =
        mod;

      function Chart({
        data,
      }: {
        data: { stage: string; count: number; value: number }[];
      }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="stage"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
                formatter={(value: ValueType | undefined) => [value ?? 0, "Deals"]}
              />
              <Bar
                dataKey="count"
                name="Deals"
                fill={CHART_COLORS.indigo}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      return { default: Chart };
    }),
  {
    ssr: false,
    loading: () => <div className="h-[260px] animate-pulse rounded-lg bg-muted" />,
  }
);

const TaskCompletionTrendChart = dynamic(
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

      function Chart({ data }: { data: { week: string; count: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="overviewTaskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                  <stop
                    offset="100%"
                    stopColor={CHART_COLORS.green}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
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
                labelFormatter={formatWeekLabel}
                formatter={(value: ValueType | undefined) => [value ?? 0, "Completed"]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={CHART_COLORS.green}
                strokeWidth={2}
                fill="url(#overviewTaskGrad)"
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.green }}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      }

      return { default: Chart };
    }),
  {
    ssr: false,
    loading: () => <div className="h-[260px] animate-pulse rounded-lg bg-muted" />,
  }
);

const SyncHealthChart = dynamic(
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
        data: {
          entity: string;
          processed: number;
          retryable: number;
          dead_letter: number;
          last_sync_at: string | null;
        }[];
      }) {
        const formatted = data.map((d) => ({
          ...d,
          entity: d.entity.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        }));

        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={formatted}
              margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="entity"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
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
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                }}
              />
              <Bar
                dataKey="processed"
                name="Processed"
                stackId="sync"
                fill={CHART_COLORS.green}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="retryable"
                name="Retryable"
                stackId="sync"
                fill={CHART_COLORS.amber}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="dead_letter"
                name="Dead Letter"
                stackId="sync"
                fill={CHART_COLORS.red}
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
    loading: () => <div className="h-[260px] animate-pulse rounded-lg bg-muted" />,
  }
);

// --- Section card wrapper ---

function SectionCard({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {subtitle && (
          <span className="ml-auto text-xs text-muted-foreground">{subtitle}</span>
        )}
      </div>
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

function OverviewSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-80 animate-pulse rounded-lg border border-border bg-card"
        />
      ))}
    </div>
  );
}

// --- Main component ---

export default function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/overview");
      if (!res.ok) throw new Error("Failed to fetch analytics overview");
      const json: AnalyticsOverviewResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <OverviewSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-12">
        <AlertTriangle className="size-8 text-amber-500" />
        <p className="text-sm text-muted-foreground">{error || "No data"}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/80"
        >
          <RefreshCw className="size-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Contacts Growth */}
      <SectionCard
        title="Contacts Growth"
        icon={<Users className="size-4" />}
        subtitle={`${data.contacts.total} total · ${data.contacts.newThisWeek} this week`}
      >
        {data.contacts.weeklyGrowth.length === 0 ? (
          <NoData label="contacts growth" />
        ) : (
          <ContactsGrowthChart data={data.contacts.weeklyGrowth} />
        )}
      </SectionCard>

      {/* Pipeline by Stage */}
      <SectionCard
        title="Pipeline by Stage"
        icon={<Layers className="size-4" />}
        subtitle={`${data.pipeline.dealCount} deals · ${formatCurrency(data.pipeline.totalValue)} · ~${data.pipeline.avgVelocityDays}d avg`}
      >
        {data.pipeline.byStage.length === 0 ? (
          <NoData label="pipeline" />
        ) : (
          <PipelineByStageChart data={data.pipeline.byStage} />
        )}
      </SectionCard>

      {/* Task Completion Trends */}
      <SectionCard
        title="Task Completion Trends"
        icon={<CheckCircle2 className="size-4" />}
        subtitle={`${data.tasks.completedThisWeek} completed this week · ${data.tasks.overdueCount} overdue`}
      >
        {data.tasks.weeklyCompletion.length === 0 ? (
          <NoData label="task completion" />
        ) : (
          <TaskCompletionTrendChart data={data.tasks.weeklyCompletion} />
        )}
      </SectionCard>

      {/* Sync Health */}
      <SectionCard
        title="Sync Health"
        icon={<Activity className="size-4" />}
        subtitle="Ingest pipeline status"
      >
        {data.sync.entities.length === 0 ||
        data.sync.entities.every(
          (e) => e.processed === 0 && e.retryable === 0 && e.dead_letter === 0
        ) ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            No ingest data yet
          </div>
        ) : (
          <div className="space-y-3">
            {/* Queue summary */}
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>
                Queue: <strong className="text-foreground">{data.sync.queue.pending}</strong> pending
              </span>
              <span>
                <strong className="text-amber-500">{data.sync.queue.retryable}</strong> retryable
              </span>
              <span>
                <strong className="text-red-500">{data.sync.queue.dead_letter}</strong> dead letter
              </span>
            </div>
            <SyncHealthChart data={data.sync.entities} />
            {/* Last synced timestamps */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {data.sync.entities.map((e) => (
                <div key={e.entity} className="flex items-center gap-1">
                  <Clock className="size-3" />
                  <span className="capitalize">{e.entity}:</span>
                  <span className="text-foreground">
                    {e.last_sync_at
                      ? new Date(e.last_sync_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "Never"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
