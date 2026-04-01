import { createServiceClient } from "@/lib/supabase/service";
import { ActivityTimeline } from "@/components/activity/ActivityTimeline";
import type { ActivityLogEntry } from "@/components/activity/ActivityItem";

export const revalidate = 60;

export default async function ActivityPage() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[Activity] query error:", error.message);
  }

  const entries = (data as ActivityLogEntry[]) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Activity Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chronological feed of all dashboard actions and system events
        </p>
      </div>

      <ActivityTimeline initialEntries={entries} />
    </div>
  );
}
