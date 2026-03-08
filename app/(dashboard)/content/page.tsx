import { createServiceClient } from "@/lib/supabase/service";
import { BufferCalendar } from "@/components/content/BufferCalendar";
import type { ContentPost, Project } from "@/lib/types/database";
import {
  startOfWeek,
  endOfWeek,
} from "date-fns";

type PostWithProject = ContentPost & {
  projects?: { id: string; name: string; color: string | null } | null;
};

export default async function ContentPage() {
  const supabase = createServiceClient();

  // Fetch initial week range of posts
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  const [postsResult, projectsResult] = await Promise.all([
    supabase
      .from("content_posts")
      .select("*, projects:project_id(id, name, color)")
      .or(
        `and(scheduled_at.gte.${weekStart.toISOString()},scheduled_at.lte.${weekEnd.toISOString()}),and(scheduled_for.gte.${weekStart.toISOString()},scheduled_for.lte.${weekEnd.toISOString()})`
      )
      .order("scheduled_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("projects")
      .select("id, name, color")
      .eq("status", "active")
      .order("name"),
  ]);

  const posts = (postsResult.data as PostWithProject[]) ?? [];
  const projects =
    (projectsResult.data as Pick<Project, "id" | "name" | "color">[]) ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">
          Content Calendar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule and manage posts across all projects
        </p>
      </div>

      <BufferCalendar initialPosts={posts} projects={projects} />
    </div>
  );
}
