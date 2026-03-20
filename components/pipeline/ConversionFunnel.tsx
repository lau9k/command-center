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
  totalValue: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/** Compute stage-to-stage conversion: (nextStageCount / currentStageCount) * 100 */
function computeStageConversions(
  data: StageConversion[]
): { from: string; to: string; rate: number }[] {
  const conversions: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];
    const rate = current.count > 0 ? Math.round((next.count / current.count) * 100) : 0;
    conversions.push({ from: current.stage_name, to: next.stage_name, rate });
  }
  return conversions;
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

      function CustomTooltip({ active, payload }: {
        active?: boolean;
        payload?: Array<{ payload: StageConversion }>;
      }) {
        if (!active || !payload?.[0]) return null;
        const stage = payload[0].payload;
        return (
          <div
            style={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "13px",
              padding: "8px 12px",
            }}
          >
            <p style={{ color: "hsl(var(--foreground))", fontWeight: 600, margin: 0 }}>
              {stage.stage_name}
            </p>
            <p style={{ color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>
              {stage.count} deals · {formatCurrency(stage.value)}
            </p>
          </div>
        );
      }

      function Chart({ data }: { data: StageConversion[] }) {
        const defaultColor = "#3B82F6";

        return (
          <ResponsiveContainer width="100%" height={Math.max(200, data.length * 52)}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="stage_name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Deals" barSize={28}>
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
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] animate-pulse rounded-lg bg-muted" />
    ),
  }
);

export function ConversionFunnel({ data, totalValue }: ConversionFunnelProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
        No pipeline data available
      </div>
    );
  }

  const conversions = computeStageConversions(data);

  return (
    <div className="space-y-4">
      {/* Total pipeline value header */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">
          {formatCurrency(totalValue)}
        </span>
        <span className="text-sm text-muted-foreground">total pipeline value</span>
      </div>

      {/* Horizontal bar chart */}
      <FunnelChart data={data} />

      {/* Stage-to-stage conversion labels */}
      {conversions.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {conversions.map((c) => (
            <div
              key={`${c.from}-${c.to}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span>{c.from}</span>
              <span aria-hidden="true">→</span>
              <span>{c.to}:</span>
              <span className="font-semibold text-foreground">{c.rate}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
