"use client";

import dynamic from "next/dynamic";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

interface WeeklyDataPoint {
  week: string;
  count: number;
  value?: number;
}

interface TrendChartsProps {
  tasksCompleted: WeeklyDataPoint[];
  contentPublished: WeeklyDataPoint[];
  contactsAdded: WeeklyDataPoint[];
  pipelineDeals: (WeeklyDataPoint & { value: number })[];
}

function formatWeekLabel(week: unknown): string {
  const d = new Date(String(week) + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const TrendLineChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        LineChart,
        Line,
        XAxis,
        YAxis,
        Tooltip,
        ResponsiveContainer,
        CartesianGrid,
      } = mod;

      function Chart({
        data,
        dataKey,
        color,
        label,
      }: {
        data: WeeklyDataPoint[];
        dataKey: string;
        color: string;
        label: string;
      }) {
        return (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
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
                formatter={(value: ValueType | undefined) => [value ?? 0, label]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      }

      return { default: Chart };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

function TrendCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-all duration-150 hover:border-ring/50 hover:shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function TrendCharts({
  tasksCompleted,
  contentPublished,
  contactsAdded,
  pipelineDeals,
}: TrendChartsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <TrendCard title="Tasks Completed / Week">
        {tasksCompleted.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No task data for this period
          </p>
        ) : (
          <TrendLineChart
            data={tasksCompleted}
            dataKey="count"
            color="#22C55E"
            label="Tasks"
          />
        )}
      </TrendCard>

      <TrendCard title="Content Published / Week">
        {contentPublished.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No content data for this period
          </p>
        ) : (
          <TrendLineChart
            data={contentPublished}
            dataKey="count"
            color="#6366f1"
            label="Posts"
          />
        )}
      </TrendCard>

      <TrendCard title="New Contacts / Week">
        {contactsAdded.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No contact data for this period
          </p>
        ) : (
          <TrendLineChart
            data={contactsAdded}
            dataKey="count"
            color="#3B82F6"
            label="Contacts"
          />
        )}
      </TrendCard>

      <TrendCard title="Pipeline Deals / Week">
        {pipelineDeals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No pipeline data for this period
          </p>
        ) : (
          <TrendLineChart
            data={pipelineDeals}
            dataKey="count"
            color="#8b5cf6"
            label="Deals"
          />
        )}
      </TrendCard>
    </div>
  );
}
