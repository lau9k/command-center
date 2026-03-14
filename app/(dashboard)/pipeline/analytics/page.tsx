import { createServiceClient } from "@/lib/supabase/service";
import { PipelineSubNav } from "@/components/pipeline/PipelineSubNav";
import { ConversionFunnel } from "@/components/pipeline/ConversionFunnel";
import { StageDurationCards } from "@/components/pipeline/StageDurationCards";
import { PipelineMetricsGrid } from "@/components/pipeline/PipelineMetricsGrid";
import { Trophy, XCircle, Target, DollarSign, Zap } from "lucide-react";
import { KpiCard } from "@/components/ui";

export const dynamic = "force-dynamic";

interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  color: string | null;
}

interface PipelineItem {
  id: string;
  stage_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

function parseDealValue(metadata: Record<string, unknown> | null): number {
  if (!metadata) return 0;
  const raw = metadata.deal_value;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const num = parseFloat(raw.replace(/[$,\s]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

export default async function PipelineAnalyticsPage() {
  const supabase = createServiceClient();

  const [stagesResult, itemsResult] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, slug, sort_order, color")
      .order("sort_order", { ascending: true }),
    supabase
      .from("pipeline_items")
      .select("id, stage_id, metadata, created_at, updated_at"),
  ]);

  const stages = (stagesResult.data ?? []) as PipelineStage[];
  const items = (itemsResult.data ?? []) as PipelineItem[];

  // Group items by stage
  const itemsByStage = new Map<string, PipelineItem[]>();
  for (const item of items) {
    const existing = itemsByStage.get(item.stage_id) ?? [];
    existing.push(item);
    itemsByStage.set(item.stage_id, existing);
  }

  // Conversion funnel
  const totalItems = items.length;
  const funnel = stages.map((stage) => {
    const stageItems = itemsByStage.get(stage.id) ?? [];
    const count = stageItems.length;
    const value = stageItems.reduce((sum, item) => sum + parseDealValue(item.metadata), 0);
    return {
      stage_name: stage.name,
      stage_slug: stage.slug,
      color: stage.color,
      sort_order: stage.sort_order,
      count,
      value,
      conversion_rate: totalItems > 0 ? Math.round((count / totalItems) * 100) : 0,
    };
  });

  // Win/loss
  const wonSlugs = new Set(["won", "closed-won"]);
  const lostSlugs = new Set(["lost", "closed-lost"]);
  const wonStageIds = new Set(stages.filter((s) => wonSlugs.has(s.slug)).map((s) => s.id));
  const lostStageIds = new Set(stages.filter((s) => lostSlugs.has(s.slug)).map((s) => s.id));

  const wonItems = items.filter((i) => wonStageIds.has(i.stage_id));
  const lostItems = items.filter((i) => lostStageIds.has(i.stage_id));
  const completedCount = wonItems.length + lostItems.length;
  const winRate = completedCount > 0 ? Math.round((wonItems.length / completedCount) * 100) : 0;
  const wonValue = wonItems.reduce((sum, i) => sum + parseDealValue(i.metadata), 0);
  const lostValue = lostItems.reduce((sum, i) => sum + parseDealValue(i.metadata), 0);

  // Deal velocity: avg days from created_at to updated_at for won deals
  const wonVelocities = wonItems.map((item) => {
    const created = new Date(item.created_at).getTime();
    const updated = new Date(item.updated_at).getTime();
    return (updated - created) / (1000 * 60 * 60 * 24);
  });
  const avgDealVelocity =
    wonVelocities.length > 0
      ? Math.round((wonVelocities.reduce((sum, d) => sum + d, 0) / wonVelocities.length) * 10) / 10
      : 0;

  // Stage durations + metrics grid data
  const now = Date.now();
  const stageDurations = stages.map((stage) => {
    const stageItems = itemsByStage.get(stage.id) ?? [];
    if (stageItems.length === 0) {
      return {
        stage_id: stage.id,
        stage_name: stage.name,
        stage_slug: stage.slug,
        color: stage.color,
        avg_days: 0,
      };
    }

    const totalDays = stageItems.reduce((sum, item) => {
      const created = new Date(item.created_at).getTime();
      return sum + (now - created) / (1000 * 60 * 60 * 24);
    }, 0);

    return {
      stage_id: stage.id,
      stage_name: stage.name,
      stage_slug: stage.slug,
      color: stage.color,
      avg_days: Math.round((totalDays / stageItems.length) * 10) / 10,
    };
  });

  const stageMetrics = stages.map((stage) => {
    const stageItems = itemsByStage.get(stage.id) ?? [];
    const count = stageItems.length;
    const totalValue = stageItems.reduce((sum, item) => sum + parseDealValue(item.metadata), 0);
    const avgValue = count > 0 ? Math.round(totalValue / count) : 0;

    const days = stageItems.map((item) => {
      const created = new Date(item.created_at).getTime();
      return (now - created) / (1000 * 60 * 60 * 24);
    });
    const avgDays =
      count > 0
        ? Math.round((days.reduce((sum, d) => sum + d, 0) / count) * 10) / 10
        : 0;

    const conversionRate = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;

    return {
      stage_id: stage.id,
      stage_name: stage.name,
      stage_slug: stage.slug,
      color: stage.color,
      sort_order: stage.sort_order,
      count,
      total_value: totalValue,
      avg_value: avgValue,
      avg_days: avgDays,
      conversion_rate: conversionRate,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pipeline Analytics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deal velocity, conversion rates, and win/loss analysis
          </p>
        </div>
        <PipelineSubNav />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Deal Velocity"
          value={`${avgDealVelocity} days`}
          subtitle="Avg lead to won"
          icon={<Zap className="size-5" />}
        />
        <KpiCard
          label="Win Rate"
          value={`${winRate}%`}
          icon={<Target className="size-5" />}
        />
        <KpiCard
          label="Deals Won"
          value={wonItems.length.toString()}
          subtitle={formatCurrency(wonValue)}
          icon={<Trophy className="size-5" />}
        />
        <KpiCard
          label="Deals Lost"
          value={lostItems.length.toString()}
          subtitle={formatCurrency(lostValue)}
          icon={<XCircle className="size-5" />}
        />
        <KpiCard
          label="Total Pipeline"
          value={formatCurrency(
            items.reduce((sum, i) => sum + parseDealValue(i.metadata), 0)
          )}
          subtitle={`${totalItems} deals`}
          icon={<DollarSign className="size-5" />}
        />
      </div>

      {/* Stage Breakdown */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Stage Breakdown
        </h3>
        <PipelineMetricsGrid data={stageMetrics} />
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Conversion Funnel
        </h3>
        <ConversionFunnel data={funnel} />
        {/* Conversion rate labels */}
        {funnel.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {funnel.map((stage) => (
              <div
                key={stage.stage_slug}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <div
                  className="size-2 rounded-full"
                  style={{ backgroundColor: stage.color ?? "#3B82F6" }}
                />
                <span>{stage.stage_name}:</span>
                <span className="font-medium text-foreground">
                  {stage.conversion_rate}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage Durations */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Average Time in Stage
        </h3>
        <StageDurationCards data={stageDurations} />
      </div>
    </div>
  );
}
