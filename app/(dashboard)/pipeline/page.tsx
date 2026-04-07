import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata: Metadata = { title: "Pipeline" };
import { createServiceClient } from "@/lib/supabase/service";
import { PipelineBoard } from "@/components/pipeline/PipelineBoard";
import { PipelineKPIStripConnected } from "@/components/pipeline/PipelineKPIStripConnected";
import { PipelineMetrics } from "@/components/pipeline/PipelineMetrics";
import { PipelineSubNav } from "@/components/pipeline/PipelineSubNav";
import { getQueryClient } from "@/lib/query-client";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["pipeline", "stages", "global"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("pipeline_stages")
          .select(
            "id, name, slug, sort_order, color, pipeline_id, project_id"
          )
          .order("sort_order", { ascending: true });
        if (error) {
          console.error("[Pipeline] stages query error:", error.message);
          return [];
        }
        return data ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["projects", "list"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name")
          .order("name", { ascending: true });
        if (error) {
          console.error("[Pipeline] projects query error:", error.message);
          return [];
        }
        return data ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["pipeline", "items", "global"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("pipeline_items")
          .select(
            "id, pipeline_id, stage_id, project_id, title, entity_type, metadata, sort_order, created_at, updated_at"
          )
          .order("sort_order", { ascending: true });
        if (error) {
          console.error("[Pipeline] items query error:", error.message);
          return [];
        }
        return data ?? [];
      },
    }),
  ]);

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
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PipelineKPIStripConnected />
        <PipelineMetrics />
        <PipelineBoard />
      </HydrationBoundary>
    </div>
  );
}
