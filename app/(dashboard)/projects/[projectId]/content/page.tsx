import { createServiceClient } from "@/lib/supabase/service";
import { MeekCalendar } from "@/components/content/MeekCalendar";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarDays } from "lucide-react";
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

  const typedPosts = (posts as ContentPost[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Content Calendar</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule and manage posts across platforms
        </p>
      </div>

      {typedPosts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No content posts yet"
          description="Schedule your first post to start managing content for this project."
        />
      ) : (
        <MeekCalendar
          initialPosts={typedPosts}
          projectId={projectId}
        />
      )}
    </div>
  );
}
