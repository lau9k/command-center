"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SyncLogEntry } from "./SyncSourceCards";

interface SyncFrequencyChartProps {
  entries: SyncLogEntry[];
}

interface DayBucket {
  date: string;
  success: number;
  error: number;
  records: number;
}

function bucketByDay(entries: SyncLogEntry[]): DayBucket[] {
  const map = new Map<string, DayBucket>();

  for (const entry of entries) {
    const date = new Date(entry.started_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const bucket = map.get(date) ?? { date, success: 0, error: 0, records: 0 };

    if (entry.status === "success" || entry.status === "partial") {
      bucket.success++;
    } else if (entry.status === "error") {
      bucket.error++;
    }
    bucket.records += entry.records_synced ?? entry.record_count ?? 0;

    map.set(date, bucket);
  }

  return Array.from(map.values()).reverse();
}

function SyncFrequencyChartInner({ entries }: SyncFrequencyChartProps) {
  const data = bucketByDay(entries);

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
        No sync data to chart
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
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
        />
        <Area
          type="monotone"
          dataKey="success"
          name="Successful"
          stackId="1"
          stroke="#22C55E"
          fill="#22C55E"
          fillOpacity={0.3}
        />
        <Area
          type="monotone"
          dataKey="error"
          name="Failed"
          stackId="1"
          stroke="#EF4444"
          fill="#EF4444"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export { SyncFrequencyChartInner };
export type { SyncFrequencyChartProps };
