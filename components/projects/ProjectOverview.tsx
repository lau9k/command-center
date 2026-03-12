"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  MessageSquare,
  FileText,
  Layers,
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { statusBadgeClass } from "@/lib/design-tokens";

interface KPIs {
  tasks: number;
  conversations: number;
  content: number;
  pipeline: number;
}

interface RecentTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee: string | null;
}

interface RecentConversation {
  id: string;
  summary: string | null;
  channel: string | null;
  last_message_at: string | null;
  contact_id: string | null;
}

interface RecentContent {
  id: string;
  title: string | null;
  platform: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
}

interface PipelineStage {
  stage: string;
  count: number;
}

interface OverviewData {
  kpis: KPIs;
  recentTasks: RecentTask[];
  recentConversations: RecentConversation[];
  recentContent: RecentContent[];
  pipelineByStage: PipelineStage[];
}

const taskStatusConfig: Record<
  string,
  { label: string; icon: typeof Circle }
> = {
  todo: { label: "To Do", icon: Circle },
  in_progress: { label: "In Progress", icon: Clock },
  done: { label: "Done", icon: CheckCircle2 },
  blocked: { label: "Blocked", icon: AlertCircle },
};

const priorityBadgeClass: Record<string, string> = {
  critical: "bg-[#EF4444]/20 text-[#EF4444]",
  high: "bg-[#F97316]/20 text-[#F97316]",
  medium: "bg-[#EAB308]/20 text-[#EAB308]",
  low: "bg-[#6B7280]/20 text-[#6B7280]",
};

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-md border bg-muted/30"
        />
      ))}
    </div>
  );
}

export function ProjectOverview({ projectId }: { projectId: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch(`/api/projects/${projectId}/overview`);
        if (res.ok) {
          const json = await res.json() as OverviewData;
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <SkeletonList rows={5} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <SkeletonList />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground">
        Failed to load project overview.
      </p>
    );
  }

  const { kpis, recentTasks, recentConversations, recentContent, pipelineByStage } =
    data;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.tasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.conversations}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Content Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.content}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Items</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.pipeline}</div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column grid: Recent Tasks + Recent Conversations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tasks</CardTitle>
            <CardDescription>Top 5 by priority</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTasks.length > 0 ? (
              <div className="space-y-3">
                {recentTasks.map((task) => {
                  const config = taskStatusConfig[task.status] ?? taskStatusConfig.todo;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <config.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="font-medium truncate">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={priorityBadgeClass[task.priority] ?? ""}>
                          {task.priority}
                        </Badge>
                        <Badge variant="secondary">{config.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tasks yet. Create one from the Tasks tab.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>Last 3 conversations</CardDescription>
          </CardHeader>
          <CardContent>
            {recentConversations.length > 0 ? (
              <div className="space-y-3">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {conv.summary ?? "No summary"}
                      </span>
                    </div>
                    {conv.channel && (
                      <Badge variant="secondary">{conv.channel}</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No conversations yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-column grid: Recent Content + Pipeline Summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Content */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Content</CardTitle>
            <CardDescription>Last 3 content posts</CardDescription>
          </CardHeader>
          <CardContent>
            {recentContent.length > 0 ? (
              <div className="space-y-3">
                {recentContent.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {post.title ?? "Untitled post"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {post.platform && (
                        <Badge variant="outline">{post.platform}</Badge>
                      )}
                      <Badge className={statusBadgeClass[post.status] ?? ""}>
                        {post.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No content posts yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Summary</CardTitle>
            <CardDescription>Items by stage</CardDescription>
          </CardHeader>
          <CardContent>
            {pipelineByStage.length > 0 ? (
              <div className="space-y-3">
                {pipelineByStage.map((stage) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium capitalize">
                        {stage.stage}
                      </span>
                    </div>
                    <span className="text-lg font-semibold">{stage.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No pipeline items yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
