import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { logSync } from "@/lib/plaid-sync";
import type { Meeting, MeetingAttendee } from "@/lib/types/database";

interface ConversationPayload {
  contact_id: string;
  summary: string | null;
  channel: string;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
}

interface GranolaSyncResult {
  success: boolean;
  synced: number;
  skipped: number;
  errors: number;
}

/**
 * Get the last successful Granola sync date from sync_log.
 */
async function getLastGranolaSyncDate(): Promise<string | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sync_log")
    .select("completed_at")
    .eq("source", "granola")
    .eq("status", "success")
    .order("completed_at", { ascending: false })
    .limit(1)
    .single();

  return data?.completed_at ?? null;
}

/**
 * Fetch meetings from the meetings table created since a given date.
 */
async function fetchRecentMeetings(since: string | null): Promise<Meeting[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("meetings")
    .select("*")
    .order("meeting_date", { ascending: false });

  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch meetings: ${error.message}`);
  }

  return (data ?? []) as Meeting[];
}

/**
 * Match attendee emails/names to existing contacts.
 * Returns the first matched contact_id, or null if none match.
 */
async function matchContactForMeeting(
  attendees: MeetingAttendee[]
): Promise<string | null> {
  const supabase = createServiceClient();

  // Try email matches first
  const emails = attendees
    .map((a) => a.email)
    .filter((e): e is string => !!e && e.length > 0);

  if (emails.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .in("email", emails)
      .limit(1)
      .single();

    if (data?.id) return data.id;
  }

  // Fall back to name matches
  const names = attendees
    .map((a) => a.name)
    .filter((n): n is string => !!n && n.length > 0);

  if (names.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .in("name", names)
      .limit(1)
      .single();

    if (data?.id) return data.id;
  }

  return null;
}

/**
 * Transform a meeting into a conversation payload.
 */
function transformToConversation(
  meeting: Meeting,
  contactId: string
): ConversationPayload {
  const attendeeNames = (meeting.attendees as MeetingAttendee[])
    .map((a) => a.name)
    .filter(Boolean)
    .join(", ");

  return {
    contact_id: contactId,
    summary: meeting.summary ?? meeting.title,
    channel: "meeting",
    last_message_at: meeting.meeting_date ?? meeting.created_at,
    metadata: {
      granola_id: meeting.granola_id,
      meeting_id: meeting.id,
      title: meeting.title,
      attendees: attendeeNames,
      source: "meeting",
    },
  };
}

/**
 * Check if a meeting has already been synced as a conversation (dedup by granola_id or meeting_id).
 */
async function isAlreadySynced(meeting: Meeting): Promise<boolean> {
  const supabase = createServiceClient();

  // Check by granola_id in metadata
  const identifier = meeting.granola_id ?? meeting.id;

  const { data } = await supabase
    .from("conversations")
    .select("id")
    .or(
      `metadata->>granola_id.eq.${identifier},metadata->>meeting_id.eq.${meeting.id}`
    )
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Orchestrate: fetch meetings since last sync, transform, insert as conversations.
 */
export async function syncGranola(): Promise<GranolaSyncResult> {
  const supabase = createServiceClient();

  // Log sync start
  const logId = await logSync("granola", "running", 0);

  try {
    const lastSync = await getLastGranolaSyncDate();
    const meetings = await fetchRecentMeetings(lastSync);

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const meeting of meetings) {
      try {
        // Dedup check
        const alreadySynced = await isAlreadySynced(meeting);
        if (alreadySynced) {
          skipped++;
          continue;
        }

        // Match to a contact
        const contactId = await matchContactForMeeting(
          meeting.attendees as MeetingAttendee[]
        );

        if (!contactId) {
          await logSync(
            "granola",
            "warning",
            0,
            `No contact match for meeting ${meeting.id} (${meeting.title})`
          );
          console.warn(
            `[granola-sync] No contact match for meeting ${meeting.id} (${meeting.title})`
          );
        }

        // Transform and insert directly (using service client, not the ingest endpoint)
        const payload = contactId
          ? transformToConversation(meeting, contactId)
          : {
              contact_id: null as string | null,
              summary: meeting.summary ?? meeting.title,
              channel: "meeting" as const,
              last_message_at: meeting.meeting_date ?? meeting.created_at,
              metadata: {
                granola_id: meeting.granola_id,
                meeting_id: meeting.id,
                title: meeting.title,
                attendees: (meeting.attendees as MeetingAttendee[])
                  .map((a) => a.name)
                  .filter(Boolean)
                  .join(", "),
                source: "meeting",
              },
            };

        const { error: insertError } = await supabase
          .from("conversations")
          .insert({
            contact_id: payload.contact_id,
            summary: payload.summary,
            channel: payload.channel,
            last_message_at: payload.last_message_at,
            metadata: payload.metadata,
          });

        if (insertError) {
          errors++;
          continue;
        }

        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await logSync(
          "granola",
          "error",
          0,
          `[syncMeeting] ${msg}`
        );
        console.error("[granola-sync] syncMeeting:", err);
        errors++;
      }
    }

    // Update sync log
    const status = errors > 0 ? (synced > 0 ? "partial" : "error") : "success";
    const errorMsg =
      errors > 0 ? `${errors} meeting(s) failed to sync` : undefined;

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status,
          record_count: synced,
          records_synced: synced,
          records_found: meetings.length,
          records_skipped: skipped,
          completed_at: new Date().toISOString(),
          ...(errorMsg
            ? { error_message: errorMsg, message: errorMsg }
            : {}),
        })
        .eq("id", logId);
    }

    return { success: errors === 0, synced, skipped, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "error",
          record_count: 0,
          records_synced: 0,
          records_found: 0,
          records_skipped: 0,
          completed_at: new Date().toISOString(),
          error_message: message,
          message,
        })
        .eq("id", logId);
    }
    return { success: false, synced: 0, skipped: 0, errors: 1 };
  }
}
