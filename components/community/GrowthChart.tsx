"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

export interface GrowthDataPoint {
  date: string;
  holders: number;
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim() || fallback
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 text-muted-foreground">{label}</p>}
      <p className="font-medium text-foreground">
        {payload[0].value.toLocaleString()} holders
      </p>
    </div>
  );
}

type TimeRange = "daily" | "weekly";

interface GrowthChartProps {
  dailyData: GrowthDataPoint[];
  weeklyData: GrowthDataPoint[];
  className?: string;
}

export function GrowthChart({
  dailyData,
  weeklyData,
  className,
}: GrowthChartProps) {
  const [range, setRange] = useState<TimeRange>("daily");
  const data = range === "daily" ? dailyData : weeklyData;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Holder Growth
        </h3>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
          {(["daily", "weekly"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                range === r
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "daily" ? "Daily" : "Weekly"}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No growth data available
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <XAxis
              dataKey="date"
              tick={{
                fill: cssVar("--chart-tick", "#737373"),
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{
                fill: cssVar("--chart-tick", "#737373"),
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="holders"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#3B82F6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
