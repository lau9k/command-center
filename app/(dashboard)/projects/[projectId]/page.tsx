import { createClient } from "@/lib/supabase/server";
import { ProjectOverview } from "@/components/projects/ProjectOverview";
import { ProjectSettings } from "@/components/projects/ProjectSettings";

export const dynamic = "force-dynamic";

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, description, status, color")
    .eq("id", projectId)
    .single();

  return (
    <div className="space-y-6">
      <ProjectOverview projectId={projectId} />
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
