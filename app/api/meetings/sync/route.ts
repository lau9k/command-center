import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { logSync } from "@/lib/plaid-sync";
import type { MeetingAttendee, MeetingActionItem, MeetingContact } from "@/lib/types/database";

// --- Granola REST API types ---

interface GranolaPerson {
  name: string;
  email?: string;
  company?: string;
}

interface GranolaMeeting {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  people?: GranolaPerson[];
  summary?: string;
  action_items?: string[];
  decisions?: string[];
  transcript_url?: string;
}

interface GranolaListResponse {
  meetings: GranolaMeeting[];
}

interface GranolaMeetingDetail {
  id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  people?: GranolaPerson[];
  summary?: string;
  action_items?: string[];
  decisions?: string[];
  transcript?: string;
  transcript_url?: string;
}

// --- Granola API client ---

const GRANOLA_API_BASE = "https://api.granola.so/v1";

async function granolaFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.GRANOLA_API_KEY;
  if (!apiKey) {
    throw new Error("GRANOLA_API_KEY is not configured");
  }

  const res = await fetch(`${GRANOLA_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Granola API ${path} returned ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function listGranolaMeetings(): Promise<GranolaMeeting[]> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const params = new URLSearchParams({
    from: since.toISOString(),
    to: new Date().toISOString(),
  });

  const data = await granolaFetch<GranolaListResponse>(
    `/meetings?${params.toString()}`
  );
  return data.meetings ?? [];
}

async function getGranolaMeetingDetail(
  meetingId: string
): Promise<GranolaMeetingDetail> {
  return granolaFetch<GranolaMeetingDetail>(`/meetings/${meetingId}`);
}

// --- Action item extraction ---

function extractActionItems(
  summary: string | undefined,
  actionItems: string[] | undefined
): MeetingActionItem[] {
  const items: MeetingActionItem[] = [];

  // Use explicit action_items from Granola if available
  if (actionItems && actionItems.length > 0) {
    for (const item of actionItems) {
      items.push(parseActionItem(item));
    }
    return items;
  }

  // Fall back to extracting from summary "Next Steps" section
  if (!summary) return items;

  const nextStepsMatch = summary.match(
    /###?\s*Next\s+Steps\s*\n([\s\S]*?)(?=\n###?\s|\n##|\z|$)/i
  );
  if (!nextStepsMatch) return items;

  const lines = nextStepsMatch[1].split("\n");
  for (const line of lines) {
    const trimmed = line.replace(/^[-*]\s*/, "").trim();
    if (trimmed.length === 0) continue;
    items.push(parseActionItem(trimmed));
  }

  return items;
}

function parseActionItem(text: string): MeetingActionItem {
  // Try to extract assignee patterns like "John to..." or "...— John"
  const toPattern = /^(\w[\w\s]*?)\s+to\s+(.+)/i;
  const dashPattern = /^(.+?)\s*[—–-]\s+(\w[\w\s]*)$/;

  const toMatch = text.match(toPattern);
  if (toMatch) {
    return { title: toMatch[2].trim(), assignee: toMatch[1].trim() };
  }

  const dashMatch = text.match(dashPattern);
  if (dashMatch) {
    return { title: dashMatch[1].trim(), assignee: dashMatch[2].trim() };
  }

  return { title: text };
}

function extractDecisions(
  summary: string | undefined,
  decisions: string[] | undefined
): string[] {
  if (decisions && decisions.length > 0) return decisions;
  if (!summary) return [];

  const result: string[] = [];
  const decisionsMatch = summary.match(
    /###?\s*(?:Decisions|Key\s+Decisions)\s*\n([\s\S]*?)(?=\n###?\s|\n##|\z|$)/i
  );
  if (!decisionsMatch) return result;

  const lines = decisionsMatch[1].split("\n");
  for (const line of lines) {
    const trimmed = line.replace(/^[-*]\s*/, "").trim();
    if (trimmed.length > 0) result.push(trimmed);
  }

  return result;
}

function extractNewContacts(people: GranolaPerson[] | undefined): MeetingContact[] {
  if (!people) return [];
  return people
    .filter((p) => p.email || p.company)
    .map((p) => ({
      name: p.name,
      email: p.email,
      company: p.company,
    }));
}

function toAttendees(people: GranolaPerson[] | undefined): MeetingAttendee[] {
  if (!people) return [];
  return people.map((p) => ({
    name: p.name,
    email: p.email,
    company: p.company,
  }));
}

// --- Sync handler ---

export const POST = withErrorHandler(async function POST() {
  const supabase = createServiceClient();
  const logId = await logSync("granola", "running", 0);

  try {
    // 1. Fetch meetings from Granola
    const granolaMeetings = await listGranolaMeetings();

    let synced = 0;
    let actionsCreated = 0;
    let skipped = 0;
    let errors = 0;

    for (const meeting of granolaMeetings) {
      try {
        // Check if already exists by granola_id
        const { data: existing } = await supabase
          .from("meetings")
          .select("id")
          .eq("granola_id", meeting.id)
          .limit(1)
          .maybeSingle();

        // Fetch detail for summary + transcript
        let detail: GranolaMeetingDetail;
        try {
          detail = await getGranolaMeetingDetail(meeting.id);
        } catch {
          // If detail fetch fails, use list data
          detail = {
            id: meeting.id,
            title: meeting.title,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            people: meeting.people,
            summary: meeting.summary,
            action_items: meeting.action_items,
            decisions: meeting.decisions,
          };
        }

        const attendees = toAttendees(detail.people ?? meeting.people);
        const actionItems = extractActionItems(detail.summary, detail.action_items);
        const decisions = extractDecisions(detail.summary, detail.decisions);
        const newContacts = extractNewContacts(detail.people ?? meeting.people);

        const meetingRow = {
          granola_id: meeting.id,
          title: detail.title || meeting.title,
          attendees: attendees as unknown as Record<string, unknown>[],
          summary: detail.summary ?? null,
          decisions: decisions,
          action_items: actionItems as unknown as Record<string, unknown>[],
          new_contacts: newContacts as unknown as Record<string, unknown>[],
          status: "pending_review" as const,
          meeting_date: detail.start_time ?? meeting.start_time ?? null,
        };

        let meetingId: string;

        if (existing) {
          // Update existing meeting
          const { error: updateError } = await supabase
            .from("meetings")
            .update({
              ...meetingRow,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (updateError) {
            errors++;
            continue;
          }
          meetingId = existing.id;
          skipped++; // count as skipped since it was an update
        } else {
          // Insert new meeting
          const { data: inserted, error: insertError } = await supabase
            .from("meetings")
            .insert(meetingRow)
            .select("id")
            .single();

          if (insertError || !inserted) {
            errors++;
            continue;
          }
          meetingId = inserted.id;
          synced++;
        }

        // Upsert action items into meeting_actions
        if (actionItems.length > 0) {
          // Clear existing actions for this meeting to avoid duplicates
          await supabase
            .from("meeting_actions")
            .delete()
            .eq("meeting_id", meetingId);

          const actionRows = actionItems.map((item) => ({
            meeting_id: meetingId,
            action_type: "create_task" as const,
            description: item.title,
            status: "pending" as const,
            metadata: {
              assignee: item.assignee ?? null,
              due_date: item.due_date ?? null,
              source: "granola_sync",
            },
          }));

          const { data: insertedActions, error: actionsError } = await supabase
            .from("meeting_actions")
            .insert(actionRows)
            .select("id");

          if (!actionsError && insertedActions) {
            actionsCreated += insertedActions.length;
          }
        }
      } catch {
        errors++;
      }
    }

    // Update sync log
    const status = errors > 0 ? (synced > 0 ? "partial" : "error") : "success";
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status,
          record_count: synced,
          records_synced: synced,
          completed_at: new Date().toISOString(),
          ...(errors > 0
            ? { error_message: `${errors} meeting(s) failed`, message: `${errors} meeting(s) failed` }
            : {}),
        })
        .eq("id", logId);
    }

    return NextResponse.json(
      { success: errors === 0, synced, actions_created: actionsCreated, skipped, errors },
      { status: errors === 0 ? 200 : 207 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "error",
          record_count: 0,
          records_synced: 0,
          completed_at: new Date().toISOString(),
          error_message: message,
          message,
        })
        .eq("id", logId);
    }

    return NextResponse.json(
      { success: false, error: message, synced: 0, actions_created: 0 },
      { status: 500 }
    );
  }
});
