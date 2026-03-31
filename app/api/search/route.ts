import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

interface SearchResultItem {
  id: string;
  type: "contact" | "pipeline" | "content" | "task" | "sponsor";
  title: string;
  subtitle: string | null;
  href: string;
}

interface GroupedSearchResults {
  tasks: SearchResultItem[];
  contacts: SearchResultItem[];
  pipeline: SearchResultItem[];
  content: SearchResultItem[];
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2 || q.length > 200) {
    const empty: GroupedSearchResults = {
      tasks: [],
      contacts: [],
      pipeline: [],
      content: [],
    };
    return NextResponse.json(empty);
  }

  const supabase = createServiceClient();
  const pattern = `%${q}%`;

  const [tasks, contacts, pipeline, content] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, project_id, title, status, priority")
      .ilike("title", pattern)
      .limit(5),
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
  ]);

  const grouped: GroupedSearchResults = {
    tasks: (tasks.data ?? []).map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: [t.status, t.priority].filter(Boolean).join(" · ") || null,
      href: t.project_id ? `/projects/${t.project_id}/tasks` : "/tasks",
    })),
    contacts: (contacts.data ?? []).map((c) => ({
      id: c.id,
      type: "contact" as const,
      title: c.name,
      subtitle: c.company || c.email || null,
      href: `/projects/${c.project_id}/contacts`,
    })),
    pipeline: (pipeline.data ?? []).map((p) => ({
      id: p.id,
      type: "pipeline" as const,
      title: p.title,
      subtitle: p.stage_id,
      href: `/projects/${p.project_id}/pipeline`,
    })),
    content: (content.data ?? []).map((c) => ({
      id: c.id,
      type: "content" as const,
      title: c.title || "Untitled Post",
      subtitle: [c.platform, c.status].filter(Boolean).join(" · ") || null,
      href: "/content",
    })),
  };

  // Also return flat results array for backward compatibility
  const results: SearchResultItem[] = [
    ...grouped.tasks,
    ...grouped.contacts,
    ...grouped.pipeline,
    ...grouped.content,
  ];

  return NextResponse.json({ ...grouped, results });
});
