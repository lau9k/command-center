import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import type { Project } from "@/lib/types/database";
import { getQueryClient } from "@/lib/query-client";
import { ProjectsListClient } from "@/components/projects/projects-list-client";
import type { ProjectWithTaskCount } from "@/components/projects/projects-list-client";
import {
  ClipboardList,
  Layers,
  FileText,
  FolderOpen,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsListPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Prefetch projects with task counts into the query client
  await queryClient.prefetchQuery({
    queryKey: ["projects", "list"],
    queryFn: async () => {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true })
        .returns<Project[]>();

      if (error) {
        console.error("[Projects] query error:", error.message);
        return [];
      }

      const typedProjects = projects ?? [];

      // Fetch task counts per project in parallel
      if (typedProjects.length === 0) return [] as ProjectWithTaskCount[];

      const countPromises = typedProjects.map((p) =>
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", p.id)
      );
      const countResults = await Promise.all(countPromises);

      return typedProjects.map((p, i) => ({
        ...p,
        task_count: countResults[i].count ?? 0,
      })) as ProjectWithTaskCount[];
    },
  });

  // Fetch cross-project KPIs in parallel
  const [
    { count: openTaskCount },
    { count: pipelineItemCount },
    { count: contentPostCount },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["todo", "in_progress"]),
    supabase
      .from("pipeline_items")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("content_posts")
      .select("id", { count: "exact", head: true }),
  ]);

  const projects =
    queryClient.getQueryData<ProjectWithTaskCount[]>(["projects", "list"]) ?? [];
  const projectCount = projects.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All projects and their current status
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Open Tasks</p>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">
            {openTaskCount ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Pipeline Items</p>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">
            {pipelineItemCount ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Content Posts</p>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">
            {contentPostCount ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Projects</p>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-1 text-lg font-bold text-foreground">
            {projectCount}
          </p>
        </div>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ProjectsListClient />
      </HydrationBoundary>
    </div>
  );
}
