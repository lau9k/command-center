import { createServiceClient } from "@/lib/supabase/service";
import { PipelineBoard } from "@/components/dashboard/PipelineBoard";

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage deals and track progress through stages
        </p>
      </div>
      <PipelineBoard stages={stages} items={items} />
    </div>
  );
}
