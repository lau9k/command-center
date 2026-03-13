import { createServiceClient } from "@/lib/supabase/service";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { PipelineKPIStrip } from "@/components/pipeline/PipelineKPIStrip";
import { PipelineMetrics } from "@/components/pipeline/PipelineMetrics";
import { PipelineSubNav } from "@/components/pipeline/PipelineSubNav";

export const dynamic = "force-dynamic";

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

export default async function PipelinePage() {
  const supabase = createServiceClient();

  const [stagesResult, itemsResult] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, slug, sort_order, color, pipeline_id, project_id")
      .order("sort_order", { ascending: true }),
    supabase
      .from("pipeline_items")
      .select(
        "id, pipeline_id, stage_id, project_id, title, entity_type, metadata, sort_order, created_at, updated_at"
      )
      .order("sort_order", { ascending: true }),
  ]);

  const stages = stagesResult.data ?? [];
  const items = itemsResult.data ?? [];

  // Build stage lookup
  const stageById = new Map(stages.map((s) => [s.id, s]));

  // Compute KPIs from actual DB data
  type ItemMeta = { deal_value?: number | string; close_date?: string; probability?: number | string };
  const totalDeals = items.length;

  function parseDealValue(raw: unknown): number {
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") {
      const num = parseFloat(raw.replace(/[$,\s]/g, ""));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  const totalValue = items.reduce((sum, item) => {
    const meta = (item.metadata ?? {}) as ItemMeta;
    return sum + parseDealValue(meta.deal_value);
  }, 0);

  const avgDealSize = totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0;

  // Win rate
  const wonStageIds = new Set(
    stages.filter((s) => s.slug === "won" || s.slug === "closed-won").map((s) => s.id)
  );
  const lostStageIds = new Set(
    stages.filter((s) => s.slug === "lost" || s.slug === "closed-lost").map((s) => s.id)
  );
  const wonDeals = items.filter((item) => wonStageIds.has(item.stage_id)).length;
  const completedDeals = wonDeals + items.filter((item) => lostStageIds.has(item.stage_id)).length;
  const winRate = completedDeals > 0 ? Math.round((wonDeals / completedDeals) * 100) : 0;

  // Weighted forecast: sum of deal_value * stage probability (excluding won/lost)
  const weightedForecast = Math.round(
    items.reduce((sum, item) => {
      const stage = stageById.get(item.stage_id);
      if (!stage) return sum;
      if (wonStageIds.has(item.stage_id) || lostStageIds.has(item.stage_id)) return sum;
      const meta = (item.metadata ?? {}) as ItemMeta;
      const value = parseDealValue(meta.deal_value);
      const weight = STAGE_WEIGHTS[stage.slug] ?? 0.5;
      return sum + value * weight;
    }, 0)
  );

  // Deals closing this month
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const closingThisMonth = items.filter((item) => {
    const meta = (item.metadata ?? {}) as ItemMeta;
    if (!meta.close_date) return false;
    const d = new Date(meta.close_date);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage deals and track progress through stages
          </p>
        </div>
        <PipelineSubNav />
      </div>
      <PipelineKPIStrip
        totalDeals={totalDeals}
        totalValue={totalValue}
        avgDealSize={avgDealSize}
        winRate={winRate}
        weightedForecast={weightedForecast}
        closingThisMonth={closingThisMonth}
      />
      <PipelineMetrics stages={stages} items={items} />
      <PipelineBoard stages={stages} items={items} />
    </div>
  );
}
