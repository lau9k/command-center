import { headers } from "next/headers";
import { MeetingsClient } from "@/components/meetings/meetings-client";
import type { Meeting, MeetingAction } from "@/lib/types/database";

export const dynamic = "force-dynamic";

type MeetingWithActions = Meeting & { actions: MeetingAction[] };

interface MeetingsApiResponse {
  data: MeetingWithActions[];
  pagination: { page: number; pageSize: number; total: number; hasMore: boolean };
  error?: string;
}

async function fetchMeetingsFromApi(): Promise<MeetingsApiResponse> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  const res = await fetch(`${protocol}://${host}/api/meetings?pageSize=200`, {
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[Meetings] API error:", res.status);
    return { data: [], pagination: { page: 1, pageSize: 200, total: 0, hasMore: false } };
  }

  return res.json();
}

export default async function MeetingsPage() {
  const { data: meetings } = await fetchMeetingsFromApi();

  // KPI computations
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

      <MeetingsClient meetings={meetings} />
    </div>
  );
}
