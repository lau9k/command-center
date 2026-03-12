"use client";

import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { KpiCard } from "@/components/ui";
import type { ForecastResult } from "./types";
import { formatCurrency } from "./types";

interface ForecastSummaryProps {
  activeResult: ForecastResult;
}

export function ForecastSummary({ activeResult }: ForecastSummaryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        label="Runway"
        value={
          activeResult.runway >= 90
            ? "90+ days"
            : `${activeResult.runway} days`
        }
        subtitle={
          activeResult.runway < 30
            ? "Critical"
            : activeResult.runway < 60
              ? "Watch"
              : "Healthy"
        }
        icon={<Calendar className="size-5" />}
      />
      <KpiCard
        label="Min Balance"
        value={formatCurrency(activeResult.minBalance)}
        subtitle={
          activeResult.minBalance < 0
            ? "Goes negative!"
            : "Stays positive"
        }
        icon={
          activeResult.minBalance < 0 ? (
            <AlertTriangle className="size-5 text-[#EF4444]" />
          ) : (
            <TrendingDown className="size-5" />
          )
        }
      />
      <KpiCard
        label="Cash-Zero Date"
        value={
          activeResult.cashZeroDate
            ? new Date(
                activeResult.cashZeroDate + "T00:00:00"
              ).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
              })
            : "None"
        }
        subtitle={
          activeResult.cashZeroDate ? "Balance hits zero" : "Within horizon"
        }
        icon={<AlertTriangle className="size-5" />}
      />
      <KpiCard
        label="End Balance"
        value={formatCurrency(
          activeResult.timeSeries[activeResult.timeSeries.length - 1]
            ?.base ?? 0
        )}
        subtitle="Day 90 projected"
        icon={<TrendingUp className="size-5" />}
      />
    </div>
  );
}
