import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface SearchResult {
  id: string;
  type: "contact" | "pipeline" | "content" | "task";
  title: string;
  subtitle: string | null;
  href: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createServiceClient();
  const pattern = `%${q}%`;

  const [contacts, pipeline, content, tasks] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, project_id, name, company, email")
      .or(`name.ilike.${pattern},company.ilike.${pattern},email.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("pipeline_items")
      .select("id, project_id, title, stage_id")
      .ilike("title", pattern)
      .limit(5),
    supabase
      .from("content_posts")
      .select("id, project_id, title, platform, status")
      .or(`title.ilike.${pattern},caption.ilike.${pattern}`)
      .limit(5),
    supabase
      .from("tasks")
      .select("id, project_id, title, status, priority")
      .ilike("title", pattern)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  if (contacts.data) {
    for (const c of contacts.data) {
      results.push({
        id: c.id,
        type: "contact",
        title: c.name,
        subtitle: c.company || c.email || null,
        href: `/projects/${c.project_id}/contacts`,
      });
    }
  }

  if (pipeline.data) {
    for (const p of pipeline.data) {
      results.push({
        id: p.id,
        type: "pipeline",
        title: p.title,
        subtitle: p.stage_id,
        href: `/projects/${p.project_id}/pipeline`,
      });
    }
  }

  if (content.data) {
    for (const c of content.data) {
      results.push({
        id: c.id,
        type: "content",
        title: c.title || "Untitled Post",
        subtitle: [c.platform, c.status].filter(Boolean).join(" · ") || null,
        href: "/content",
      });
    }
  }

  if (tasks.data) {
    for (const t of tasks.data) {
      results.push({
        id: t.id,
        type: "task",
        title: t.title,
        subtitle: [t.status, t.priority].filter(Boolean).join(" · ") || null,
        href: t.project_id ? `/projects/${t.project_id}/tasks` : "/tasks",
      });
    }
  }

  return NextResponse.json({ results });
}
