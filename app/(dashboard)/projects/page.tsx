import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { Project } from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, FolderOpen } from "lucide-react";
import { statusBadgeClass } from "@/lib/design-tokens";

export const dynamic = "force-dynamic";

interface ProjectWithTaskCount extends Project {
  task_count: number;
}

export default async function ProjectsListPage() {
  const supabase = createServiceClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<Project[]>();

  // Fetch task counts per project in parallel
  const projectsWithCounts: ProjectWithTaskCount[] = [];
  if (projects && projects.length > 0) {
    const countPromises = projects.map((p) =>
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("project_id", p.id)
    );
    const countResults = await Promise.all(countPromises);
    for (let i = 0; i < projects.length; i++) {
      projectsWithCounts.push({
        ...projects[i],
        task_count: countResults[i].count ?? 0,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All projects and their current status
        </p>
      </div>

      {projectsWithCounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projectsWithCounts.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-colors hover:bg-muted/50 cursor-pointer h-full">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: project.color ?? "#6B7280" }}
                    />
                    <CardTitle className="text-base truncate">
                      {project.name}
                    </CardTitle>
                  </div>
                  <Badge className={statusBadgeClass[project.status] ?? ""}>
                    {project.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ClipboardList className="h-4 w-4" />
                    <span>
                      {project.task_count} task{project.task_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No projects found. Create your first project to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
