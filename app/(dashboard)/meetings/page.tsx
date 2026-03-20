import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { MeetingsClient } from "@/components/meetings/meetings-client";
import type { Meeting, MeetingAction } from "@/lib/types/database";
import { getQueryClient } from "@/lib/query-client";

export const dynamic = "force-dynamic";

type MeetingWithActions = Meeting & { actions: MeetingAction[] };

export default async function MeetingsPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Prefetch meetings and actions into the query client
  await queryClient.prefetchQuery({
    queryKey: ["meetings", "list"],
    queryFn: async () => {
      const { data: meetings, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .order("meeting_date", { ascending: false });

      if (meetingsError) {
        console.error("[Meetings] query error:", meetingsError.message);
        return [];
      }

      const typedMeetings = (meetings ?? []) as Meeting[];

      // Fetch actions for all meetings
      const meetingIds = typedMeetings.map((m) => m.id);
      let actions: MeetingAction[] = [];

      if (meetingIds.length > 0) {
        const { data: actionsData, error: actionsError } = await supabase
          .from("meeting_actions")
          .select("*")
          .in("meeting_id", meetingIds)
          .order("created_at", { ascending: true });

        if (actionsError) {
          console.error("[Meetings] actions query error:", actionsError.message);
        } else {
          actions = (actionsData ?? []) as MeetingAction[];
        }
      }

      // Group actions by meeting_id
      const actionsByMeeting = new Map<string, MeetingAction[]>();
      for (const action of actions) {
        const existing = actionsByMeeting.get(action.meeting_id) ?? [];
        existing.push(action);
        actionsByMeeting.set(action.meeting_id, existing);
      }

      return typedMeetings.map((m) => ({
        ...m,
        actions: actionsByMeeting.get(m.id) ?? [],
      })) as MeetingWithActions[];
    },
  });

  // Compute KPIs from prefetched data
  const meetings =
    queryClient.getQueryData<MeetingWithActions[]>(["meetings", "list"]) ?? [];

  const totalMeetings = meetings.length;
  const pendingReview = meetings.filter((m) => m.status === "pending_review").length;
  const reviewed = meetings.filter((m) => m.status === "reviewed").length;
  const allActions = meetings.flatMap((m) => m.actions);
  const totalActions = allActions.length;
  const completedActions = allActions.filter((a) => a.status === "completed").length;

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

      <HydrationBoundary state={dehydrate(queryClient)}>
        <MeetingsClient />
      </HydrationBoundary>
    </div>
  );
}
