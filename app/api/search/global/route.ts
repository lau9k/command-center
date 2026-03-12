import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

const searchParamsSchema = z.object({
  q: z.string().min(2).max(200),
});

interface GlobalSearchResult {
  id: string;
  type: "task" | "contact" | "pipeline" | "content" | "sponsor";
  title: string;
  subtitle: string | null;
  href: string;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const parsed = searchParamsSchema.safeParse({ q: searchParams.get("q") });

  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }

  const q = parsed.data.q.trim();
  const supabase = createServiceClient();
  const pattern = `%${q}%`;

  const [tasks, contacts, pipeline, content, sponsors] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, project_id, title, status, priority")
      .ilike("title", pattern)
      .limit(5),
    supabase
      .from("contacts")
      .select("id, project_id, name, company, email")
      .or(
        `name.ilike.${pattern},company.ilike.${pattern},email.ilike.${pattern}`
      )
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
      .from("sponsors")
      .select("id, name, tier, status, contact_name")
      .or(`name.ilike.${pattern},contact_name.ilike.${pattern}`)
      .limit(5),
  ]);

  const results: GlobalSearchResult[] = [];

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

  if (sponsors.data) {
    for (const s of sponsors.data) {
      results.push({
        id: s.id,
        type: "sponsor",
        title: s.name,
        subtitle: [s.tier, s.status].filter(Boolean).join(" · ") || null,
        href: "/sponsors",
      });
    }
  }

  return NextResponse.json({ results });
});
