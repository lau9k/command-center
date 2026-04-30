import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Contact } from "@/lib/types/database";

export interface ConversationItem {
  id: string;
  type: "email" | "linkedin" | "meeting" | "other";
  subject: string | null;
  preview: string;
  timestamp: string;
  external_url: string | null;
  channel_label: string;
}

const FEED_LIMIT_PER_TABLE = 50;
const FEED_FINAL_CAP = 30;

/**
 * Fetch unified conversation history for a deal's primary contacts.
 *
 * Sources:
 * - `conversations` table (covers both email and LinkedIn DMs via the `channel` field)
 * - `meetings` table (joined via attendees JSONB array overlap with contact email/name)
 *
 * Note: there is no separate `emails` table in this schema — emails are stored in
 * `conversations` with channel='email' or 'gmail'.
 */
export async function getDealConversations(
  contactIds: string[]
): Promise<ConversationItem[]> {
  if (contactIds.length === 0) return [];

  const supabase = createServiceClient();

  // Step 1: resolve contact names + emails for the meetings join
  const { data: contactsData } = await supabase
    .from("contacts")
    .select("id, name, email")
    .in("id", contactIds);

  const contacts = (contactsData ?? []) as Pick<Contact, "id" | "name" | "email">[];

  // Step 2: parallel queries
  const [conversationsRes, meetingsRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, summary, channel, last_message_at, created_at, metadata")
      .in("contact_id", contactIds)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(FEED_LIMIT_PER_TABLE),
    contacts.length > 0
      ? supabase
          .from("meetings")
          .select("id, title, summary, meeting_date, created_at")
          .or(buildMeetingsAttendeesFilter(contacts))
          .order("meeting_date", { ascending: false, nullsFirst: false })
          .limit(FEED_LIMIT_PER_TABLE)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const items: ConversationItem[] = [];

  if (conversationsRes.data) {
    for (const c of conversationsRes.data as Array<{
      id: string;
      summary: string | null;
      channel: string | null;
      last_message_at: string | null;
      created_at: string;
      metadata: Record<string, unknown> | null;
    }>) {
      const channel = (c.channel ?? "").toLowerCase();
      const type: ConversationItem["type"] =
        channel === "linkedin" || channel === "kondo"
          ? "linkedin"
          : channel === "email" || channel === "gmail"
          ? "email"
          : "other";
      const meta = c.metadata ?? {};
      const subject =
        typeof meta.subject === "string" && meta.subject.length > 0
          ? meta.subject
          : null;
      const externalUrl =
        typeof meta.external_url === "string" ? meta.external_url : null;
      items.push({
        id: c.id,
        type,
        subject,
        preview: c.summary ?? "(no summary)",
        timestamp: c.last_message_at ?? c.created_at,
        external_url: externalUrl,
        channel_label:
          type === "email"
            ? "Email"
            : type === "linkedin"
            ? "LinkedIn"
            : c.channel ?? "Other",
      });
    }
  }

  if (meetingsRes.data) {
    for (const m of meetingsRes.data as Array<{
      id: string;
      title: string;
      summary: string | null;
      meeting_date: string | null;
      created_at: string;
    }>) {
      items.push({
        id: m.id,
        type: "meeting",
        subject: m.title,
        preview: m.summary ?? "(no summary)",
        timestamp: m.meeting_date ?? m.created_at,
        external_url: null,
        channel_label: "Meeting",
      });
    }
  }

  // Sort desc by timestamp, cap
  items.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return items.slice(0, FEED_FINAL_CAP);
}

function escapeForOr(value: string): string {
  // PostgREST `or` filter values must escape commas, parens, and double quotes
  return value.replace(/[",()\\]/g, "\\$&");
}

function buildMeetingsAttendeesFilter(
  contacts: Pick<Contact, "id" | "name" | "email">[]
): string {
  const parts: string[] = [];
  for (const c of contacts) {
    if (c.email) {
      parts.push(`attendees.cs.[{"email":"${escapeForOr(c.email)}"}]`);
    }
    if (c.name) {
      parts.push(`attendees.cs.[{"name":"${escapeForOr(c.name)}"}]`);
    }
  }
  return parts.join(",");
}
