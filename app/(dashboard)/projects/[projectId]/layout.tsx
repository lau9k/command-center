import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types/database";
import { Badge } from "@/components/ui/badge";
import { SessionPromptButton } from "@/components/dashboard/SessionPromptButton";
import { statusBadgeClass } from "@/lib/design-tokens";
import { ProjectSubNav } from "@/components/projects/ProjectSubNav";

const statusColors: Record<string, string> = {
  active: statusBadgeClass.active,
  paused: statusBadgeClass.paused,
  completed: statusBadgeClass.completed,
  archived: statusBadgeClass.archived,
};

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single<Project>();

  if (error || !project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
          <Badge className={statusColors[project.status] ?? ""}>
            {project.status}
          </Badge>
          <SessionPromptButton projectKey={project.name.toLowerCase()} />
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <ProjectSubNav projectId={projectId} />

      {children}
    </div>
  );
}
