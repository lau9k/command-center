"use client";

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { colors } from "@/lib/design-tokens";

interface SparklinePoint {
  day: string;
  count: number;
}

interface ActivityPageHeaderProps {
  todayCount: number;
  totalCount: number;
  taskCount: number;
  contentCount: number;
  sparklineData: SparklinePoint[];
}

export function ActivityPageHeader({
  todayCount,
  totalCount,
  taskCount,
  contentCount,
  sparklineData,
}: ActivityPageHeaderProps) {
  return (
    <div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Activity</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unified stream of all system events in reverse-chronological order
          </p>
        </div>

        {/* 7-day sparkline */}
        {sparklineData.length > 0 && (
          <div className="hidden sm:block w-40 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.accent.blue} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={colors.accent.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: colors.bg.secondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: colors.text.primary,
                  }}
                  labelFormatter={(label) =>
                    new Date(String(label)).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={colors.accent.blue}
                  strokeWidth={1.5}
                  fill="url(#activityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Today</p>
          <p className="mt-1 text-lg font-bold text-foreground">{todayCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Events</p>
          <p className="mt-1 text-lg font-bold text-foreground">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Tasks Completed</p>
          <p className="mt-1 text-lg font-bold text-[#22C55E]">{taskCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Content Published</p>
          <p className="mt-1 text-lg font-bold text-[#A855F7]">{contentCount}</p>
        </div>
      </div>
    </div>
  );
}
