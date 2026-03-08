import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import type { Task, ContentPost } from "@/lib/types/database";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Users,
  Layers,
  CheckCircle2,
  Clock,
  Circle,
  Plus,
} from "lucide-react";
import { MeekCalendarStrip } from "@/components/content/MeekCalendarStrip";

export const dynamic = "force-dynamic";

const taskStatusConfig: Record<string, { label: string; icon: typeof Circle }> =
  {
    todo: { label: "To Do", icon: Circle },
    in_progress: { label: "In Progress", icon: Clock },
    done: { label: "Done", icon: CheckCircle2 },
  };

export default async function ProjectSummaryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const serviceClient = createServiceClient();

  const [
    { count: totalTasks },
    { count: todoCount },
    { count: inProgressCount },
    { count: doneCount },
    { count: totalContacts },
    { count: pipelineCount },
    { data: recentTasks },
    { data: contentPosts },
  ] = await Promise.all([
    serviceClient
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    serviceClient
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "todo"),
    serviceClient
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "in_progress"),
    serviceClient
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .eq("status", "done"),
    serviceClient
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    serviceClient
      .from("pipeline_items")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
    serviceClient
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<Task[]>(),
    serviceClient
      .from("content_posts")
      .select("*")
      .eq("project_id", projectId)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .returns<ContentPost[]>(),
  ]);

  const statusBreakdown = [
    { key: "todo", count: todoCount ?? 0 },
    { key: "in_progress", count: inProgressCount ?? 0 },
    { key: "done", count: doneCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalContacts ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Pipeline Items
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipelineCount ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 text-sm">
              {statusBreakdown.map(({ key, count }) => {
                const config = taskStatusConfig[key];
                return (
                  <div key={key} className="flex items-center gap-1">
                    <config.icon className="h-3 w-3" />
                    <span>
                      {count} {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href={`/projects/${projectId}/tasks`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/projects/${projectId}/contacts`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Contact
          </Link>
        </Button>
      </div>

      {/* Content Calendar Strip */}
      {contentPosts && contentPosts.length > 0 && (
        <MeekCalendarStrip posts={contentPosts} projectId={projectId} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
          <CardDescription>Last 5 updated tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTasks && recentTasks.length > 0 ? (
            <div className="space-y-3">
              {recentTasks.map((task) => {
                const config = taskStatusConfig[task.status];
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <config.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <Badge variant="secondary">{config.label}</Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tasks yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
