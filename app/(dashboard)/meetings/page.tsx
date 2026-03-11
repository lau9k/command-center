import { createServiceClient } from "@/lib/supabase/service";
import { MeetingsClient } from "@/components/meetings/meetings-client";
import type { Meeting, MeetingAction } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const supabase = createServiceClient();

  const [meetingsRes, actionsRes] = await Promise.all([
    supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: false }),
    supabase
      .from("meeting_actions")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  if (meetingsRes.error) {
    console.error("[Meetings] Query error:", meetingsRes.error.message);
  }
  if (actionsRes.error) {
    console.error("[MeetingActions] Query error:", actionsRes.error.message);
  }

  const meetings = (meetingsRes.data ?? []) as Meeting[];
  const actions = (actionsRes.data ?? []) as MeetingAction[];

  // Group actions by meeting_id
  const actionsByMeeting = new Map<string, MeetingAction[]>();
  for (const action of actions) {
    const existing = actionsByMeeting.get(action.meeting_id) ?? [];
    existing.push(action);
    actionsByMeeting.set(action.meeting_id, existing);
  }

  const meetingsWithActions = meetings.map((m) => ({
    ...m,
    actions: actionsByMeeting.get(m.id) ?? [],
  }));

  // KPI computations
  const totalMeetings = meetings.length;
  const pendingReview = meetings.filter((m) => m.status === "pending_review").length;
  const reviewed = meetings.filter((m) => m.status === "reviewed").length;
  const totalActions = actions.length;
  const completedActions = actions.filter((a) => a.status === "completed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Meetings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review past meetings and track post-meeting actions
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total Meetings</p>
          <p className="mt-1 text-lg font-bold text-foreground">{totalMeetings}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Pending Review</p>
          <p className="mt-1 text-lg font-bold text-[#F59E0B]">{pendingReview}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Reviewed</p>
          <p className="mt-1 text-lg font-bold text-[#22C55E]">{reviewed}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Actions Completed</p>
          <p className="mt-1 text-lg font-bold text-foreground">
            {completedActions}/{totalActions}
          </p>
        </div>
      </div>

      <MeetingsClient meetings={meetingsWithActions} />
    </div>
  );
}
