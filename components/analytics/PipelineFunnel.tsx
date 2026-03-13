"use client";

import dynamic from "next/dynamic";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";

interface FunnelStage {
  stage_name: string;
  count: number;
  value: number;
  conversion_rate: number;
}

interface PipelineFunnelProps {
  data: FunnelStage[];
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

const FunnelChart = dynamic(
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

      function Chart({ data }: PipelineFunnelProps) {
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
                formatter={(value: ValueType | undefined) => [value ?? 0, "Deals"]}
              />
              <Bar
                dataKey="count"
                name="count"
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
      <div className="h-[280px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

export function PipelineFunnel({ data }: PipelineFunnelProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
        No pipeline data available
      </div>
    );
  }

  return (
    <div>
      <FunnelChart data={data} />
      <div className="mt-3 flex flex-wrap gap-3">
        {data.map((stage) => (
          <div
            key={stage.stage_name}
            className="text-xs text-muted-foreground"
          >
            <span className="font-medium text-foreground">
              {stage.stage_name}
            </span>
            : {stage.count} deals ({stage.conversion_rate}%) &middot;{" "}
            {formatCurrency(stage.value)}
          </div>
        ))}
      </div>
    </div>
  );
}
