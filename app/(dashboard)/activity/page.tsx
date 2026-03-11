import { createServiceClient } from "@/lib/supabase/service";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ActivityPageHeader } from "@/components/activity/activity-page-header";
import type { ActivityFeedItem, ActivityEventType } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const supabase = createServiceClient();

  // Fetch from all source tables in parallel
  const [tasksRes, contentRes, notifsRes, dealsRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, description, status, project_id, updated_at, projects(id, name, color)")
      .eq("status", "done")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("content_posts")
      .select("id, title, platform, status, project_id, published_at, updated_at, projects(id, name, color)")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("notifications")
      .select("id, title, body, type, source, project_id, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("pipeline_items")
      .select("id, title, stage, value, project_id, updated_at, projects(id, name, color)")
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const items: ActivityFeedItem[] = [];

  // Map tasks
  if (tasksRes.data) {
    for (const t of tasksRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = ((t as any).projects as { id: string; name: string; color: string | null }[] | null)?.[0] ?? null;
      items.push({
        id: `task-${t.id}`,
        type: "task_completed",
        title: `Task completed: ${t.title}`,
        description: t.description,
        project_id: t.project_id,
        project_name: project?.name ?? null,
        project_color: project?.color ?? null,
        source_table: "tasks",
        source_id: t.id,
        created_at: t.updated_at,
      });
    }
  }

  // Map content posts
  if (contentRes.data) {
    for (const p of contentRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = ((p as any).projects as { id: string; name: string; color: string | null }[] | null)?.[0] ?? null;
      items.push({
        id: `content-${p.id}`,
        type: "content_published",
        title: `Content published: ${p.title ?? "Untitled"}`,
        description: p.platform ? `Published on ${p.platform}` : null,
        project_id: p.project_id,
        project_name: project?.name ?? null,
        project_color: project?.color ?? null,
        source_table: "content_posts",
        source_id: p.id,
        created_at: p.published_at ?? p.updated_at,
      });
    }
  }

  // Map notifications
  if (notifsRes.data) {
    for (const n of notifsRes.data) {
      let eventType: ActivityEventType = "system";
      if (n.source === "github" || n.type === "signal") eventType = "pr_merged";
      if (n.source === "memory") eventType = "memory_flushed";

      items.push({
        id: `notif-${n.id}`,
        type: eventType,
        title: n.title,
        description: n.body,
        project_id: n.project_id,
        project_name: null,
        project_color: null,
        source_table: "notifications",
        source_id: n.id,
        created_at: n.created_at,
      });
    }
  }

  // Map pipeline items
  if (dealsRes.data) {
    for (const d of dealsRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const project = ((d as any).projects as { id: string; name: string; color: string | null }[] | null)?.[0] ?? null;
      items.push({
        id: `deal-${d.id}`,
        type: "deal_moved",
        title: `Deal updated: ${d.title}`,
        description: `Stage: ${d.stage}${d.value ? ` · $${Number(d.value).toLocaleString()}` : ""}`,
        project_id: d.project_id,
        project_name: project?.name ?? null,
        project_color: project?.color ?? null,
        source_table: "pipeline_items",
        source_id: d.id,
        created_at: d.updated_at,
      });
    }
  }

  // Sort by created_at descending
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Today's count for KPI
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayCount = items.filter(
    (i) => new Date(i.created_at).getTime() >= todayStart.getTime()
  ).length;

  // Compute 7-day sparkline data
  const now = new Date();
  const sparklineData: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStr = date.toISOString().slice(0, 10);
    const count = items.filter(
      (item) => item.created_at.slice(0, 10) === dayStr
    ).length;
    sparklineData.push({ day: dayStr, count });
  }

  const taskCount = items.filter((i) => i.type === "task_completed").length;
  const contentCount = items.filter((i) => i.type === "content_published").length;
  const initialItems = items.slice(0, 50);
  const hasMore = items.length > 50;

  return (
    <div className="space-y-6">
      <ActivityPageHeader
        todayCount={todayCount}
        totalCount={items.length}
        taskCount={taskCount}
        contentCount={contentCount}
        sparklineData={sparklineData}
      />

      <ActivityTimeline
        initialItems={initialItems}
        initialTotal={items.length}
        initialHasMore={hasMore}
      />
    </div>
  );
}
