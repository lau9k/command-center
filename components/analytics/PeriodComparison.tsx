"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PeriodComparisonProps {
  current: number;
  previous: number;
  periodLabel: string;
  format?: "number" | "currency";
}

function formatValue(value: number, format: "number" | "currency"): string {
  if (format === "currency") {
    if (Math.abs(value) >= 1_000_000)
      return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }
  return value.toLocaleString();
}

function computeDelta(current: number, previous: number) {
  if (previous === 0 && current === 0) return { pct: 0, direction: "flat" as const };
  if (previous === 0) return { pct: 100, direction: "up" as const };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return { pct: 0, direction: "flat" as const };
  return {
    pct: Math.abs(rounded),
    direction: rounded > 0 ? ("up" as const) : ("down" as const),
  };
}

export function PeriodComparison({
  current,
  previous,
  periodLabel,
  format = "number",
}: PeriodComparisonProps) {
  const { pct, direction } = computeDelta(current, previous);

  const Icon =
    direction === "up"
      ? TrendingUp
      : direction === "down"
        ? TrendingDown
        : Minus;

  const colorClass =
    direction === "up"
      ? "text-green-500"
      : direction === "down"
        ? "text-red-500"
        : "text-muted-foreground";

  const bgClass =
    direction === "up"
      ? "bg-green-500/10"
      : direction === "down"
        ? "bg-red-500/10"
        : "bg-muted/50";

  const tooltipText = `Current: ${formatValue(current, format)} · Previous: ${formatValue(previous, format)}`;

  return (
    <span
      title={tooltipText}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        colorClass,
        bgClass
      )}
    >
      <Icon className="size-3" />
      {direction === "flat" ? (
        <span>0% vs last {periodLabel}</span>
      ) : (
        <span>
          {direction === "up" ? "+" : "-"}
          {pct}% vs last {periodLabel}
        </span>
      )}
    </span>
  );
}
