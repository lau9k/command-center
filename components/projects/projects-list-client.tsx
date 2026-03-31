"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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

export interface ProjectWithTaskCount extends Project {
  task_count: number;
}

export function ProjectsListClient() {
  const { data: projects = [] } = useQuery<ProjectWithTaskCount[]>({
    queryKey: ["projects", "list"],
  });

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            No projects found. Create your first project to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
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
  );
}
