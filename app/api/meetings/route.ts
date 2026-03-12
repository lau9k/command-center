import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import type { Meeting, MeetingAction } from "@/lib/types/database";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const status = searchParams.get("status") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  const search = searchParams.get("q") ?? searchParams.get("search") ?? undefined;

  const supabase = createServiceClient();

  // Build meetings query
  let meetingsQuery = supabase
    .from("meetings")
    .select("*", { count: "exact" })
    .order("meeting_date", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) {
    meetingsQuery = meetingsQuery.eq("status", status);
  }

  if (search) {
    meetingsQuery = meetingsQuery.or(
      `title.ilike.%${search}%,summary.ilike.%${search}%`
    );
  }

  const { data: meetings, error: meetingsError, count } = await meetingsQuery;

  if (meetingsError) {
    return NextResponse.json(
      { error: meetingsError.message },
      { status: 500 }
    );
  }

  const typedMeetings = (meetings ?? []) as Meeting[];

  // Fetch actions for returned meetings
  const meetingIds = typedMeetings.map((m) => m.id);
  let actions: MeetingAction[] = [];

  if (meetingIds.length > 0) {
    const { data: actionsData, error: actionsError } = await supabase
      .from("meeting_actions")
      .select("*")
      .in("meeting_id", meetingIds)
      .order("created_at", { ascending: true });

    if (actionsError) {
      console.error("[API] meeting_actions query error:", actionsError.message);
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

  const data = typedMeetings.map((m) => ({
    ...m,
    actions: actionsByMeeting.get(m.id) ?? [],
  }));

  const total = count ?? data.length;

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    },
  });
});
