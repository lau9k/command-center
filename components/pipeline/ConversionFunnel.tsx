"use client";

import dynamic from "next/dynamic";

interface StageConversion {
  stage_name: string;
  stage_slug: string;
  color: string | null;
  count: number;
  value: number;
  conversion_rate: number;
}

interface ConversionFunnelProps {
  data: StageConversion[];
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
        Cell,
      } = mod;

      function formatCurrency(amount: number): string {
        if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
        return `$${amount.toLocaleString()}`;
      }

      function Chart({ data }: ConversionFunnelProps) {
        const defaultColor = "#3B82F6";

        return (
          <ResponsiveContainer width="100%" height={320}>
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
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
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
                labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                formatter={(value) => {
                  const num = typeof value === "number" ? value : Number(value);
                  return [num, "Deals"];
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Deals">
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color ?? defaultColor}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      return { default: Chart };
    }),
  { ssr: false }
);

export function ConversionFunnel({ data }: ConversionFunnelProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        No pipeline data available
      </div>
    );
  }

  return <FunnelChart data={data} />;
}
