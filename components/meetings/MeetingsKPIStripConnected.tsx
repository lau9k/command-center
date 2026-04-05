"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Meeting, MeetingAction } from "@/lib/types/database";

type MeetingWithActions = Meeting & { actions: MeetingAction[] };

export function MeetingsKPIStripConnected() {
  const { data: meetings = [] } = useQuery<MeetingWithActions[]>({
    queryKey: ["meetings", "list"],
  });

  const kpis = useMemo(() => {
    const totalMeetings = meetings.length;
    const pendingReview = meetings.filter(
      (m) => m.status === "pending_review"
    ).length;
    const reviewed = meetings.filter((m) => m.status === "reviewed").length;
    const allActions = meetings.flatMap((m) => m.actions);
    const totalActions = allActions.length;
    const completedActions = allActions.filter(
      (a) => a.status === "completed"
    ).length;

    return { totalMeetings, pendingReview, reviewed, completedActions, totalActions };
  }, [meetings]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">Total Meetings</p>
        <p className="mt-1 text-lg font-bold text-foreground">
          {kpis.totalMeetings}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">Pending Review</p>
        <p className="mt-1 text-lg font-bold text-[#F59E0B]">
          {kpis.pendingReview}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">Reviewed</p>
        <p className="mt-1 text-lg font-bold text-[#22C55E]">
          {kpis.reviewed}
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">Actions Completed</p>
        <p className="mt-1 text-lg font-bold text-foreground">
          {kpis.completedActions}/{kpis.totalActions}
        </p>
      </div>
    </div>
  );
}
