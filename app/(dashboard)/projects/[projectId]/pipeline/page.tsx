import { createServiceClient } from "@/lib/supabase/service";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { PipelineKPIStrip } from "@/components/pipeline/PipelineKPIStrip";

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
      .select("id, name, slug, sort_order, color, pipeline_id")
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
  type ItemMeta = { value?: number; probability?: number };
  const totalDeals = items.length;
  const totalValue = items.reduce((sum, item) => {
    const meta = (item.metadata ?? {}) as ItemMeta;
    return sum + (meta.value ?? 0);
  }, 0);
  const avgDealSize = totalDeals > 0 ? Math.round(totalValue / totalDeals) : 0;

  // Win rate: items in "closed" stage / total items
  const closedStageIds = new Set(
    stages.filter((s) => s.slug === "closed").map((s) => s.id)
  );
  const closedDeals = items.filter((item) => closedStageIds.has(item.stage_id)).length;
  const winRate = totalDeals > 0 ? Math.round((closedDeals / totalDeals) * 100) : 0;

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
