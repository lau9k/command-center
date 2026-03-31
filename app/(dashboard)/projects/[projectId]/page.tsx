import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { getQueryClient } from "@/lib/query-client";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { ProjectSettings } from "@/components/projects/ProjectSettings";

export const dynamic = "force-dynamic";

interface PipelineByStage {
  stage: string;
  count: number;
}

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Prefetch project overview data into the query client
  await queryClient.prefetchQuery({
    queryKey: ["projects", projectId, "overview"],
    queryFn: async () => {
      const [
        { count: taskCount },
        { count: conversationCount },
        { count: contentCount },
        { count: pipelineCount },
        { data: recentTasks },
        { data: recentConversations },
        { data: recentContent },
        { data: pipelineItems },
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("content_posts")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("pipeline_items")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId),
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, assignee, created_at, updated_at")
          .eq("project_id", projectId)
          .order("priority_score", { ascending: false, nullsFirst: false })
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("conversations")
          .select("id, summary, channel, last_message_at, contact_id, created_at")
          .eq("project_id", projectId)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(3),
        supabase
          .from("content_posts")
          .select("id, title, platform, status, scheduled_at, published_at, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("pipeline_items")
          .select("id, stage_id, pipeline_stages(name)")
          .eq("project_id", projectId),
      ]);

      // Aggregate pipeline items by stage name
      const stageCounts = new Map<string, number>();
      if (pipelineItems) {
        for (const item of pipelineItems) {
          const stageName =
            (item.pipeline_stages as unknown as { name: string } | null)?.name ??
            "Unknown";
          stageCounts.set(stageName, (stageCounts.get(stageName) ?? 0) + 1);
        }
      }
      const pipelineByStage: PipelineByStage[] = Array.from(
        stageCounts.entries()
      ).map(([stage, count]) => ({ stage, count }));

      return {
        kpis: {
          tasks: taskCount ?? 0,
          conversations: conversationCount ?? 0,
          content: contentCount ?? 0,
          pipeline: pipelineCount ?? 0,
        },
        recentTasks: recentTasks ?? [],
        recentConversations: recentConversations ?? [],
        recentContent: recentContent ?? [],
        pipelineByStage,
      };
    },
  });

  // Fetch project settings data
  const { data: project } = await supabase
    .from("projects")
    .select("name, description, status, color")
    .eq("id", projectId)
    .single();

  return (
    <div className="space-y-6">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectOverview projectId={projectId} />
      </HydrationBoundary>
      <ProjectSettings
        projectId={projectId}
        initialName={project?.name ?? ""}
        initialDescription={project?.description ?? null}
        initialStatus={project?.status ?? "active"}
        initialColor={project?.color ?? null}
      />
    </div>
  );
}
