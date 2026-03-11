import type { Meeting, MeetingAction, MeetingActionType, MeetingAttendee, MeetingActionItem } from "@/lib/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch meetings with a given status.
 */
export async function fetchMeetingsByStatus(
  supabase: SupabaseClient,
  status: Meeting["status"]
) {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("status", status)
    .order("meeting_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Meeting[];
}

/**
 * Fetch all meetings ordered by date, optionally filtered by status.
 */
export async function fetchMeetings(
  supabase: SupabaseClient,
  statusFilter?: Meeting["status"]
) {
  let query = supabase
    .from("meetings")
    .select("*")
    .order("meeting_date", { ascending: false });

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

/**
 * Fetch actions for a specific meeting.
 */
export async function fetchMeetingActions(
  supabase: SupabaseClient,
  meetingId: string
) {
  const { data, error } = await supabase
    .from("meeting_actions")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MeetingAction[];
}

/**
 * Update a meeting's status.
 */
export async function updateMeetingStatus(
  supabase: SupabaseClient,
  meetingId: string,
  status: Meeting["status"]
) {
  const { error } = await supabase
    .from("meetings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", meetingId);

  if (error) throw error;
}

/**
 * Create a meeting action record.
 */
export async function createMeetingAction(
  supabase: SupabaseClient,
  action: {
    meeting_id: string;
    action_type: MeetingActionType;
    description: string;
    status?: MeetingAction["status"];
    metadata?: Record<string, unknown>;
  }
) {
  const { data, error } = await supabase
    .from("meeting_actions")
    .insert(action)
    .select()
    .single();

  if (error) throw error;
  return data as MeetingAction;
}

/**
 * Generate a follow-up email template from meeting data.
 */
export function generateFollowUpEmail(meeting: Meeting): string {
  const attendeeNames = (meeting.attendees as MeetingAttendee[])
    .map((a) => a.name)
    .join(", ");

  const actionItemsList = (meeting.action_items as MeetingActionItem[])
    .map((item, i) => `${i + 1}. ${item.title}${item.assignee ? ` (${item.assignee})` : ""}`)
    .join("\n");

  const dateStr = meeting.meeting_date
    ? new Date(meeting.meeting_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "our recent meeting";

  return `Subject: Follow-up: ${meeting.title}

Hi ${attendeeNames || "team"},

Thank you for taking the time to meet on ${dateStr}. Here's a quick summary of what we discussed:

${meeting.summary || "No summary available."}

${actionItemsList ? `Action Items:\n${actionItemsList}` : ""}

Please let me know if I missed anything or if you have any questions.

Best regards`;
}

/**
 * Generate intro email templates for attendee pairs.
 */
export function generateIntroTemplates(meeting: Meeting): Array<{
  from: string;
  to: string;
  template: string;
}> {
  const attendees = meeting.attendees as MeetingAttendee[];
  const templates: Array<{ from: string; to: string; template: string }> = [];

  for (let i = 0; i < attendees.length; i++) {
    for (let j = i + 1; j < attendees.length; j++) {
      const a = attendees[i];
      const b = attendees[j];
      templates.push({
        from: a.name,
        to: b.name,
        template: `Subject: Introduction: ${a.name} <> ${b.name}

Hi ${a.name} and ${b.name},

I wanted to introduce you two! You both attended "${meeting.title}" and I think you'd benefit from connecting.

${a.name}${a.email ? ` (${a.email})` : ""} — ${a.company || ""}
${b.name}${b.email ? ` (${b.email})` : ""} — ${b.company || ""}

I'll let you take it from here!

Best regards`,
      });
    }
  }

  return templates;
}

/**
 * Generate a meeting notes document from meeting data.
 */
export function generateMeetingDocument(meeting: Meeting): string {
  const attendees = meeting.attendees as MeetingAttendee[];
  const decisions = meeting.decisions as string[];
  const actionItems = meeting.action_items as MeetingActionItem[];

  const dateStr = meeting.meeting_date
    ? new Date(meeting.meeting_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date not specified";

  const attendeeList = attendees.map((a) => `- ${a.name}${a.company ? ` (${a.company})` : ""}`).join("\n");
  const decisionList = decisions.map((d, i) => `${i + 1}. ${d}`).join("\n");
  const actionList = actionItems
    .map((item, i) => `${i + 1}. ${item.title}${item.assignee ? ` — Assigned to: ${item.assignee}` : ""}${item.due_date ? ` — Due: ${item.due_date}` : ""}`)
    .join("\n");

  return `# ${meeting.title}
Date: ${dateStr}

## Attendees
${attendeeList || "No attendees listed."}

## Summary
${meeting.summary || "No summary available."}

## Key Decisions
${decisionList || "No decisions recorded."}

## Action Items
${actionList || "No action items recorded."}`;
}
