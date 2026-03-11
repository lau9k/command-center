import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import type { ActivityFeedItem, ActivityEventType } from "@/lib/types/database";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const offset = Number(searchParams.get("offset") ?? 0);
  const typeFilter = searchParams.get("type");
  const projectId = searchParams.get("project_id");

  const items: ActivityFeedItem[] = [];

  // --- 1. Tasks (completed) → task_completed ---
  if (!typeFilter || typeFilter === "task_completed") {
    let taskQuery = supabase
      .from("tasks")
      .select("id, title, description, status, project_id, updated_at, projects(id, name, color)")
      .eq("status", "done")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (projectId) taskQuery = taskQuery.eq("project_id", projectId);

    const { data: tasks } = await taskQuery;
    if (tasks) {
      for (const t of tasks) {
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
  }

  // --- 2. Content posts (published) → content_published ---
  if (!typeFilter || typeFilter === "content_published") {
    let contentQuery = supabase
      .from("content_posts")
      .select("id, title, platform, status, project_id, published_at, updated_at, projects(id, name, color)")
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (projectId) contentQuery = contentQuery.eq("project_id", projectId);

    const { data: posts } = await contentQuery;
    if (posts) {
      for (const p of posts) {
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
  }

  // --- 3. Notifications → system events ---
  if (!typeFilter || typeFilter === "system") {
    let notifQuery = supabase
      .from("notifications")
      .select("id, title, body, type, source, project_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (projectId) notifQuery = notifQuery.eq("project_id", projectId);

    const { data: notifs } = await notifQuery;
    if (notifs) {
      for (const n of notifs) {
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
  }

  // --- 4. Pipeline items → deal_moved ---
  if (!typeFilter || typeFilter === "deal_moved") {
    let pipelineQuery = supabase
      .from("pipeline_items")
      .select("id, title, stage, value, project_id, updated_at, projects(id, name, color)")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (projectId) pipelineQuery = pipelineQuery.eq("project_id", projectId);

    const { data: deals } = await pipelineQuery;
    if (deals) {
      for (const d of deals) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const project = ((d as any).projects as { id: string; name: string; color: string | null }[] | null)?.[0] ?? null;
        items.push({
          id: `deal-${d.id}`,
          type: "deal_moved",
          title: `Deal updated: ${d.title}`,
          description: `Stage: ${d.stage}${d.value ? ` · $${d.value.toLocaleString()}` : ""}`,
          project_id: d.project_id,
          project_name: project?.name ?? null,
          project_color: project?.color ?? null,
          source_table: "pipeline_items",
          source_id: d.id,
          created_at: d.updated_at,
        });
      }
    }
  }

  // Sort all items by created_at descending
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Paginate
  const total = items.length;
  const paginated = items.slice(offset, offset + limit);

  return NextResponse.json({
    items: paginated,
    total,
    hasMore: offset + limit < total,
  });
});
