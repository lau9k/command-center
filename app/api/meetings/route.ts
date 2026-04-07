import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { syncToPersonize } from "@/lib/personize/sync";
import type { Meeting, MeetingAction, MeetingAttendee } from "@/lib/types/database";
import { z } from "zod";

export const GET = withErrorHandler(withAuth(async function GET(request: NextRequest, _user) {
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
}));

const attendeeSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  company: z.string().optional(),
});

const createMeetingSchema = z.object({
  title: z.string().min(1),
  meeting_date: z.string().nullable().optional(),
  attendees: z.array(attendeeSchema).optional().default([]),
  summary: z.string().nullable().optional(),
  decisions: z.array(z.string()).optional().default([]),
  action_items: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  new_contacts: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  status: z.string().optional().default("pending_review"),
});

const updateMeetingSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).optional(),
  meeting_date: z.string().nullable().optional(),
  attendees: z.array(attendeeSchema).optional(),
  summary: z.string().nullable().optional(),
  decisions: z.array(z.string()).optional(),
  action_items: z.array(z.record(z.string(), z.unknown())).optional(),
  new_contacts: z.array(z.record(z.string(), z.unknown())).optional(),
  status: z.string().optional(),
});

/** Extract the first attendee email for Personize sync. */
function getPrimaryAttendeeEmail(attendees: MeetingAttendee[]): string | undefined {
  for (const a of attendees) {
    if (a.email) return a.email;
  }
  return undefined;
}

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = createMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meetings")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to Personize in the background — don't block the response
  const meeting = data as Meeting;
  syncToPersonize({
    table: "meetings",
    recordId: meeting.id,
    content: JSON.stringify(data),
    email: getPrimaryAttendeeEmail(meeting.attendees),
  }).catch((err) => {
    console.error("[API] POST /api/meetings sync error:", err);
  });

  return NextResponse.json({ data }, { status: 201 });
}));

export const PATCH = withErrorHandler(withAuth(async function PATCH(request: NextRequest, _user) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateMeetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { id, ...updates } = parsed.data;

  const { data, error } = await supabase
    .from("meetings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sync to Personize in the background — don't block the response
  const meeting = data as Meeting;
  syncToPersonize({
    table: "meetings",
    recordId: meeting.id,
    content: JSON.stringify(data),
    email: getPrimaryAttendeeEmail(meeting.attendees),
  }).catch((err) => {
    console.error("[API] PATCH /api/meetings sync error:", err);
  });

  return NextResponse.json({ data });
}));
