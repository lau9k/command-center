"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { parseDealValue, formatCurrency } from "./DealCard";
import type { PipelineItemData } from "./DealCard";
import type { PipelineStage } from "./StageColumn";

interface PipelineMetricsProps {
  stages?: PipelineStage[];
  items?: PipelineItemData[];
}

interface StageMetric {
  stageId: string;
  name: string;
  color: string;
  count: number;
  totalValue: number;
}

export function PipelineMetrics({ stages: stagesProp, items: itemsProp }: PipelineMetricsProps = {}) {
  const { data: queryStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["pipeline", "stages", "global"],
    enabled: !stagesProp,
  });
  const { data: queryItems = [] } = useQuery<PipelineItemData[]>({
    queryKey: ["pipeline", "items", "global"],
    enabled: !itemsProp,
  });

  const stages = stagesProp ?? queryStages;
  const items = itemsProp ?? queryItems;
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.sort_order - b.sort_order),
    [stages],
  );

  const metrics: StageMetric[] = useMemo(() => {
    const grouped = new Map<string, { count: number; totalValue: number }>();
    for (const stage of sortedStages) {
      grouped.set(stage.id, { count: 0, totalValue: 0 });
    }
    for (const item of items) {
      const entry = grouped.get(item.stage_id);
      if (entry) {
        entry.count++;
        entry.totalValue += parseDealValue(item.metadata?.deal_value);
      }
    }
    return sortedStages.map((stage) => {
      const data = grouped.get(stage.id) ?? { count: 0, totalValue: 0 };
      return {
        stageId: stage.id,
        name: stage.name,
        color: stage.color ?? "#6B7280",
        count: data.count,
        totalValue: data.totalValue,
      };
    });
  }, [sortedStages, items]);

  if (metrics.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Stage Conversion
      </h3>
      <div className="flex items-stretch gap-1 overflow-x-auto">
        {metrics.map((metric, idx) => {
          const prevCount = idx > 0 ? metrics[idx - 1].count : null;
          const conversionRate =
            prevCount != null && prevCount > 0
              ? Math.round((metric.count / prevCount) * 100)
              : null;

          return (
            <div key={metric.stageId} className="flex items-stretch">
              {idx > 0 && (
                <div className="flex flex-col items-center justify-center px-1">
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                  {conversionRate != null && (
                    <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
                      {conversionRate}%
                    </span>
                  )}
                </div>
              )}
              <div className="flex min-w-[100px] flex-col items-center rounded-md border border-border bg-background p-3">
                <div
                  className="mb-2 size-2 rounded-full"
                  style={{ backgroundColor: metric.color }}
                />
                <span className="text-xs font-medium text-foreground">
                  {metric.name}
                </span>
                <span className="mt-1 text-lg font-bold text-foreground">
                  {metric.count}
                </span>
                {metric.totalValue > 0 && (
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    {formatCurrency(metric.totalValue)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
