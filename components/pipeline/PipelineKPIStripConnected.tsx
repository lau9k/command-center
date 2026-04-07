"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PipelineKPIStrip } from "./PipelineKPIStrip";
import type { PipelineItemData } from "./DealCard";
import type { PipelineStage } from "./StageColumn";

// Stage-level probability weights for weighted forecast
const STAGE_WEIGHTS: Record<string, number> = {
  lead: 0.1,
  contacted: 0.2,
  "demo-scheduled": 0.4,
  "proposal-sent": 0.6,
  negotiation: 0.8,
  won: 1.0,
  lost: 0,
};

type ItemMeta = {
  value?: number | string;
  close_date?: string;
  probability?: number | string;
};

function parseDealValue(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const num = parseFloat(raw.replace(/[$,\s]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function PipelineKPIStripConnected() {
  const { data: stages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["pipeline", "stages", "global"],
  });
  const { data: items = [] } = useQuery<PipelineItemData[]>({
    queryKey: ["pipeline", "items", "global"],
  });

  const kpis = useMemo(() => {
    const stageById = new Map(stages.map((s) => [s.id, s]));

    const totalDeals = items.length;

    const totalValue = items.reduce((sum, item) => {
      const meta = (item.metadata ?? {}) as ItemMeta;
      return sum + parseDealValue(meta.value);
    }, 0);

    const avgDealSize = totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0;

    const wonStageIds = new Set(
      stages
        .filter((s) => s.slug === "won" || s.slug === "closed-won")
        .map((s) => s.id)
    );
    const lostStageIds = new Set(
      stages
        .filter((s) => s.slug === "lost" || s.slug === "closed-lost")
        .map((s) => s.id)
    );
    const wonDeals = items.filter((item) => wonStageIds.has(item.stage_id)).length;
    const completedDeals =
      wonDeals + items.filter((item) => lostStageIds.has(item.stage_id)).length;
    const winRate =
      completedDeals > 0 ? Math.round((wonDeals / completedDeals) * 100) : 0;

    const weightedForecast = Math.round(
      items.reduce((sum, item) => {
        const stage = stageById.get(item.stage_id);
        if (!stage) return sum;
        if (wonStageIds.has(item.stage_id) || lostStageIds.has(item.stage_id))
          return sum;
        const meta = (item.metadata ?? {}) as ItemMeta;
        const value = parseDealValue(meta.value);
        const weight = STAGE_WEIGHTS[stage.slug] ?? 0.5;
        return sum + value * weight;
      }, 0)
    );

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const closingThisMonth = items.filter((item) => {
      const meta = (item.metadata ?? {}) as ItemMeta;
      if (!meta.close_date) return false;
      const d = new Date(meta.close_date);
      return (
        !isNaN(d.getTime()) &&
        d.getMonth() === currentMonth &&
        d.getFullYear() === currentYear
      );
    }).length;

    return { totalDeals, totalValue, avgDealSize, winRate, weightedForecast, closingThisMonth };
  }, [stages, items]);

  return <PipelineKPIStrip {...kpis} />;
}
