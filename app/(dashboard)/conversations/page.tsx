import { createServiceClient } from "@/lib/supabase/service";
import type { Conversation } from "@/lib/types/database";
import { ConversationList } from "@/components/conversations/ConversationList";

export const dynamic = "force-dynamic";

interface ConversationWithContact extends Conversation {
  contacts: {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
  } | null;
}

export default async function ConversationsPage() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("conversations")
    .select("*, contacts(id, name, email, company)")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[Conversations] query error:", error.message);
  }

  const conversations = (data as ConversationWithContact[]) ?? [];

  // KPIs
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const thisWeek = conversations.filter((c) => {
    const date = c.last_message_at ?? c.created_at;
    return new Date(date) >= oneWeekAgo;
  }).length;

  const uniqueContactIds = new Set(
    conversations.filter((c) => c.contact_id).map((c) => c.contact_id)
  );

  const uniqueChannels = new Set(
    conversations.filter((c) => c.channel).map((c) => c.channel)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Emails, meetings, and messages linked to your contacts
        </p>
      </div>

      <ConversationList
        initialConversations={conversations}
        kpis={{
          total: conversations.length,
          thisWeek,
          uniqueContacts: uniqueContactIds.size,
          channels: uniqueChannels.size,
        }}
      />
    </div>
  );
}
