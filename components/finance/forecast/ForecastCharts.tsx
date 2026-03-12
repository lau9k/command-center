"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { ForecastDayPoint, ForecastResult, ForecastRun } from "./types";
import { formatCurrency } from "./types";

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function ChartSkeleton() {
  return (
    <div className="flex h-[400px] items-center justify-center text-sm text-text-muted">
      Loading chart...
    </div>
  );
}

const RechartsArea = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } = mod;
      return {
        default: function ForecastChart({ data, overlayData, overlayName }: {
          data: ForecastDayPoint[]; overlayData?: ForecastDayPoint[]; overlayName?: string;
        }) {
          const gridColor = cssVar("--chart-grid", "#2A2A2A");
          const tickColor = cssVar("--chart-tick", "#737373");
          const legendColor = cssVar("--chart-legend", "#A0A0A0");
          const fmtDate = (v: string) => new Date(v + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" });

          return (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={fmtDate}
                  axisLine={false} tickLine={false} interval={13} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                  axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
                      <p className="mb-1 text-muted-foreground">
                        {new Date(label + "T00:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {payload.map((p: any, i: number) => (
                        <p key={i} style={{ color: p.color }} className="font-medium">
                          {String(p.name ?? "")}: {formatCurrency(Number(p.value ?? 0))}
                        </p>
                      ))}
                    </div>
                  );
                }} />
                <Legend wrapperStyle={{ fontSize: 11, color: legendColor }} />
                <Area type="monotone" dataKey="worst" stackId="band" stroke="none" fill="transparent" name="Worst Case" />
                <Area type="monotone" dataKey="best" stroke="none" fill="#3B82F6" fillOpacity={0.08} name="Best Case" />
                <Area type="monotone" dataKey="base" stroke="#3B82F6" strokeWidth={2} fill="#3B82F6" fillOpacity={0.15} name="Base" />
                <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="6 4" strokeWidth={1.5}
                  label={{ value: "$0", position: "right", fill: "#EF4444", fontSize: 11 }} />
                <ReferenceLine x="2026-04-01" stroke="#EAB308" strokeDasharray="4 4"
                  label={{ value: "Apr 1", position: "top", fill: "#EAB308", fontSize: 11 }} />
                {overlayData && (
                  <Area type="monotone" data={overlayData} dataKey="base" stroke="#A855F7"
                    strokeWidth={2} strokeDasharray="6 3" fill="none" name={overlayName ?? "Comparison"} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          );
        },
      };
    }),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface ForecastChartsProps {
  loading: boolean;
  activeResult: ForecastResult | undefined;
  compareResult: ForecastResult | undefined;
  selectedScenario: string;
  runs: ForecastRun[];
}

export function ForecastCharts({ loading, activeResult, compareResult, selectedScenario, runs }: ForecastChartsProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Cash Balance Projection
          {activeResult && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              — {runs.find((r) => r.id === selectedScenario)?.name ?? activeResult.runName}
            </span>
          )}
        </h3>
        {compareResult && <span className="text-xs text-[#A855F7]">vs {compareResult.runName}</span>}
      </div>

      {loading ? (
        <ChartSkeleton />
      ) : activeResult ? (
        <RechartsArea data={activeResult.timeSeries} overlayData={compareResult?.timeSeries} overlayName={compareResult?.runName} />
      ) : (
        <div className="flex h-[400px] items-center justify-center text-sm text-text-muted">No forecast data available</div>
      )}

      {activeResult && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {activeResult.timeSeries
            .filter((p) => p.events.length > 0)
            .slice(0, 8)
            .map((p) => (
              <span key={p.date} className="flex items-center gap-1">
                <span className={cn("inline-block size-1.5 rounded-full",
                  p.events.some((e) => e.direction === "inflow") ? "bg-[#22C55E]" : "bg-[#EF4444]")} />
                {new Date(p.date + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                : {p.events.map((e) => e.name).join(", ")}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
