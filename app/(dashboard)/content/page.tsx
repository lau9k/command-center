import { createServiceClient } from "@/lib/supabase/service";
import { ContentPageShell } from "./ContentPageShell";
import type { ContentPost, Project } from "@/lib/types/database";
import { startOfWeek, endOfWeek } from "date-fns";

type PostWithProject = ContentPost & {
  projects?: { id: string; name: string; color: string | null } | null;
};

export default async function ContentPage() {
  const supabase = createServiceClient();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const [postsResult, allPostsResult, projectsResult] = await Promise.all([
    // Calendar posts (week-scoped)
    supabase
      .from("content_posts")
      .select("*, projects:project_id(id, name, color)")
      .or(
        `and(scheduled_at.gte.${weekStart.toISOString()},scheduled_at.lte.${weekEnd.toISOString()}),and(scheduled_for.gte.${weekStart.toISOString()},scheduled_for.lte.${weekEnd.toISOString()})`
      )
      .order("scheduled_at", { ascending: true, nullsFirst: false }),
    // All posts (for board view)
    supabase
      .from("content_posts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("status", "active")
      .order("name"),
  ]);

  const calendarPosts = (postsResult.data as PostWithProject[]) ?? [];
  const allPosts = (allPostsResult.data as ContentPost[]) ?? [];
  const projects =
    (projectsResult.data as Pick<Project, "id" | "name" | "color">[]) ?? [];

  return (
    <ContentPageShell
      calendarPosts={calendarPosts}
      allPosts={allPosts}
      projects={projects}
    />
  );
}
