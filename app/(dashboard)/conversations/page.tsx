import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import { getQueryClient } from "@/lib/query-client";
import type { Conversation } from "@/lib/types/database";
import { ConversationList } from "@/components/conversations/ConversationList";
import { ExportCsvButton } from "@/components/shared/export-csv-button";

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
  const queryClient = getQueryClient();

  // Prefetch conversations list and channel counts in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["conversations", "list"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("conversations")
          .select("*, contacts(id, name, email, company)")
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          return [] as ConversationWithContact[];
        }

        return (data as ConversationWithContact[]) ?? [];
      },
    }),
    queryClient.prefetchQuery({
      queryKey: ["conversations", "channel_counts"],
      queryFn: async () => {
        const { data } = await supabase
          .from("conversations")
          .select("channel");

        const counts: Record<string, number> = { all: 0 };
        const primaryChannels = new Set(["email", "slack", "telegram"]);
        if (data) {
          counts.all = data.length;
          for (const row of data) {
            const ch = row.channel ?? "other";
            counts[ch] = (counts[ch] ?? 0) + 1;
          }
          let otherCount = 0;
          for (const [k, v] of Object.entries(counts)) {
            if (k !== "all" && !primaryChannels.has(k)) {
              otherCount += v;
            }
          }
          counts.other = otherCount;
        }
        return counts;
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails, meetings, and messages linked to your contacts
          </p>
        </div>
        <ExportCsvButton module="conversations" />
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ConversationList />
      </HydrationBoundary>
    </div>
  );
}
