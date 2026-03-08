import { createServiceClient } from "@/lib/supabase/service";
import { MeekCalendar } from "@/components/content/MeekCalendar";
import type { ContentPost } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function ProjectContentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = createServiceClient();

  const { data: posts } = await supabase
    .from("content_posts")
    .select("*")
    .eq("project_id", projectId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Content Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule and manage posts across platforms
        </p>
      </div>

      <MeekCalendar
        initialPosts={(posts as ContentPost[]) ?? []}
        projectId={projectId}
      />
    </div>
  );
}
