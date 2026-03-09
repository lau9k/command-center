"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Calendar,
  Mail,
  FileText,
  CheckSquare,
} from "lucide-react";
import type { MemoryStat, MemoryType } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Brain } from "lucide-react";

interface ProjectWithMemory {
  id: string;
  name: string;
  color: string | null;
  memoryStats: MemoryStat[];
}

interface MemoryHealthCardsProps {
  projects: ProjectWithMemory[];
}

const memoryTypeConfig: Record<
  MemoryType,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  contact: { label: "Contacts", icon: Users },
  meeting: { label: "Meetings", icon: Calendar },
  email: { label: "Emails", icon: Mail },
  content: { label: "Content", icon: FileText },
  task: { label: "Tasks", icon: CheckSquare },
};

const MEMORY_TYPES: MemoryType[] = [
  "contact",
  "meeting",
  "email",
  "content",
  "task",
];

function getSyncHealth(lastSyncedAt: string | null): {
  color: string;
  label: string;
} {
  if (!lastSyncedAt) {
    return { color: "bg-gray-400", label: "Never synced" };
  }

  const diff = Date.now() - new Date(lastSyncedAt).getTime();
  const hours = diff / (1000 * 60 * 60);

  if (hours < 1) return { color: "bg-green-500", label: "Synced recently" };
  if (hours < 24) return { color: "bg-yellow-500", label: "Synced today" };
  return { color: "bg-red-500", label: "Stale" };
}

function getOverallHealth(stats: MemoryStat[]): {
  color: string;
  label: string;
} {
  if (stats.length === 0) {
    return { color: "bg-gray-400", label: "No data" };
  }

  const latestSync = stats.reduce<string | null>((latest, s) => {
    if (!s.last_synced_at) return latest;
    if (!latest) return s.last_synced_at;
    return s.last_synced_at > latest ? s.last_synced_at : latest;
  }, null);

  return getSyncHealth(latestSync);
}

export function MemoryHealthCards({ projects }: MemoryHealthCardsProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<Brain />}
        title="No projects yet"
        description="Create a project to see memory health"
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const health = getOverallHealth(project.memoryStats);
        const statsByType = new Map(
          project.memoryStats.map((s) => [s.memory_type, s])
        );

        return (
          <Card key={project.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {project.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div
                    className={cn("h-2 w-2 rounded-full", health.color)}
                    title={health.label}
                  />
                  <span className="text-xs text-muted-foreground">
                    {health.label}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {MEMORY_TYPES.map((type) => {
                  const stat = statsByType.get(type);
                  const Icon = memoryTypeConfig[type].icon;
                  return (
                    <div
                      key={type}
                      className="flex flex-col items-center gap-1 text-center"
                      title={
                        stat?.last_synced_at
                          ? `Last synced ${formatDistanceToNow(new Date(stat.last_synced_at), { addSuffix: true })}`
                          : "Never synced"
                      }
                    >
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="text-lg font-semibold leading-none">
                        {stat?.count ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {memoryTypeConfig[type].label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {project.memoryStats.length > 0 && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Last synced{" "}
                  {formatDistanceToNow(
                    new Date(
                      project.memoryStats.reduce((latest, s) => {
                        if (!s.last_synced_at) return latest;
                        return s.last_synced_at > latest
                          ? s.last_synced_at
                          : latest;
                      }, project.memoryStats[0]?.last_synced_at ?? new Date(0).toISOString())
                    ),
                    { addSuffix: true }
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
