import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { startOfMonth, endOfMonth } from "date-fns";
import { createServiceClient } from "@/lib/supabase/service";
import { getQueryClient } from "@/lib/query-client";
import { ContentPageShell } from "./ContentPageShell";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import type { ContentPost, Project } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type PostWithProject = ContentPost & {
  projects?: Pick<Project, "id" | "name" | "color"> | null;
};

export default async function ContentPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  const now = new Date();
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["content", "posts"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("content_posts")
          .select("*, projects:project_id(id, name, color)")
          .order("scheduled_for", { ascending: false, nullsFirst: false });
        if (error) {
          console.error("[Content] posts query error:", error.message);
          return [];
        }
        return (data as PostWithProject[]) ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["content", "calendar"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("content_posts")
          .select("*, projects:project_id(id, name, color)")
          .or(
            `and(scheduled_at.gte.${monthStart},scheduled_at.lte.${monthEnd}),and(scheduled_for.gte.${monthStart},scheduled_for.lte.${monthEnd})`
          )
          .order("scheduled_at", { ascending: true, nullsFirst: false });
        if (error) {
          console.error("[Content] calendar query error:", error.message);
          return [];
        }
        return (data as PostWithProject[]) ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["projects", "list"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, color")
          .order("name", { ascending: true });
        if (error) {
          console.error("[Content] projects query error:", error.message);
          return [];
        }
        return (data as Pick<Project, "id" | "name" | "color">[]) ?? [];
      },
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex justify-end">
        <ExportCsvButton module="content" />
      </div>
      <ContentPageShell />
    </HydrationBoundary>
  );
}
