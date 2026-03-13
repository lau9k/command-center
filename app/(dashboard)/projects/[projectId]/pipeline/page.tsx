import { createServiceClient } from "@/lib/supabase/service";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { PipelineKPIStrip } from "@/components/pipeline/PipelineKPIStrip";
import { Kanban } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectPipelinePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = createServiceClient();

  const [stagesResult, itemsResult] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, slug, sort_order, color, pipeline_id, project_id")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("pipeline_items")
      .select(
        "id, pipeline_id, stage_id, project_id, title, entity_type, metadata, sort_order, created_at, updated_at"
      )
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true }),
  ]);

  const stages = stagesResult.data ?? [];
  const items = itemsResult.data ?? [];

  // Compute KPIs from actual DB data
  type ItemMeta = { deal_value?: number | string };
  const totalDeals = items.length;
  const totalValue = items.reduce((sum, item) => {
    const meta = (item.metadata ?? {}) as ItemMeta;
    const raw = meta.deal_value;
    if (typeof raw === "number") return sum + raw;
    if (typeof raw === "string") {
      const num = parseFloat(raw.replace(/[$,\s]/g, ""));
      return sum + (isNaN(num) ? 0 : num);
    }
    return sum;
  }, 0);
  const avgDealSize = totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0;

  // Win rate: items in won/closed-won stages vs total completed deals
  const wonStageIds = new Set(
    stages.filter((s) => s.slug === "won" || s.slug === "closed-won").map((s) => s.id)
  );
  const lostStageIds = new Set(
    stages.filter((s) => s.slug === "lost" || s.slug === "closed-lost").map((s) => s.id)
  );
  const wonDeals = items.filter((item) => wonStageIds.has(item.stage_id)).length;
  const completedDeals = wonDeals + items.filter((item) => lostStageIds.has(item.stage_id)).length;
  const winRate = completedDeals > 0 ? Math.round((wonDeals / completedDeals) * 100) : 0;

  if (stages.length === 0 && items.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage deals and track progress through stages
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card px-8 py-16 text-center">
          <div className="text-text-muted [&_svg]:size-12">
            <Kanban />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-foreground">No pipeline stages yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Set up pipeline stages for this project to start tracking deals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage deals and track progress through stages
        </p>
      </div>
      <PipelineKPIStrip
        totalDeals={totalDeals}
        totalValue={totalValue}
        avgDealSize={avgDealSize}
        winRate={winRate}
      />
      <PipelineBoard stages={stages} items={items} projectId={projectId} />
    </div>
  );
}
