import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServiceClient } from "@/lib/supabase/service";
import type { Contact } from "@/lib/types/database";
import { ContactsClient } from "@/components/dashboard/ContactsClient";
import { searchContacts } from "@/lib/personize/actions";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/export/ExportButton";
import { ContactsSubNav } from "@/components/contacts/ContactsSubNav";
import { getQueryClient } from "@/lib/query-client";
import client from "@/lib/personize/client";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  let personizeAvailable = false;

  // Prefetch contacts list into the query client
  await queryClient.prefetchQuery({
    queryKey: ["contacts", "list"],
    queryFn: async () => {
      // Try Personize first for live data
      if (process.env.PERSONIZE_SECRET_KEY) {
        try {
          const result = await searchContacts(undefined, 1, 50, "priority_score");
          personizeAvailable = true;
          return { contacts: result.contacts, total: result.total, personizeAvailable: true };
        } catch (error) {
          console.error("[Contacts] Personize search failed:", error);
          // Fall through to Supabase
        }
      }

      // Supabase fallback (first page only)
      const contactsRes = await supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(0, 49);

      if (contactsRes.error) {
        console.error("[Contacts] Supabase query error:", contactsRes.error.message);
        return { contacts: [], total: 0, personizeAvailable: false };
      }

      const contacts = (contactsRes.data as Contact[]) ?? [];
      return { contacts, total: contactsRes.count ?? contacts.length, personizeAvailable: false };
    },
  });

  // Prefetch KPI stats from Personize + Supabase for real enrichment counts
  await queryClient.prefetchQuery({
    queryKey: ["contacts", "kpis"],
    queryFn: async () => {
      const CONTACTS_COLLECTION_ID =
        process.env.PERSONIZE_CONTACTS_COLLECTION_ID ??
        "5686312a-7ab7-4cef-897c-576bfeb92aec";

      // 1. Get total contacts from Personize (pageSize: 1, read totalMatched)
      let totalContacts = 0;
      try {
        const searchResponse = await client.memory.search({
          collectionIds: [CONTACTS_COLLECTION_ID],
          pageSize: 1,
          page: 1,
        });
        const searchData = (searchResponse?.data ?? searchResponse) as {
          totalMatched?: number;
        };
        totalContacts = searchData?.totalMatched ?? 0;
      } catch (error) {
        console.error("[Contacts] Personize collection count failed:", error);
        // Fallback to prefetched contacts list count
        const listData = queryClient.getQueryData<{
          contacts: Contact[];
          total: number;
        }>(["contacts", "list"]);
        totalContacts = listData?.total ?? 0;
      }

      // 2. Fetch withMemories from Supabase memory_stats (real enrichment count)
      const { count: withMemories } = await supabase
        .from("memory_stats")
        .select("id", { count: "exact", head: true })
        .gt("count", 0);

      // 3. Fetch tagged-this-week and untagged from Supabase contacts
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const taggedThisWeekRes = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .gte("updated_at", oneWeekAgo.toISOString())
        .not("tags", "eq", "{}");

      if (taggedThisWeekRes.error) {
        console.error("[Contacts] tagged-this-week query error:", taggedThisWeekRes.error.message);
      }

      const taggedThisWeek = taggedThisWeekRes.count ?? 0;

      const untaggedRes = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .or("tags.eq.{},tags.is.null");

      const untagged = untaggedRes.count ?? 0;

      return {
        totalContacts,
        taggedThisWeek,
        withMemories: withMemories ?? 0,
        untagged,
      };
    },
  });

  // Read back data for the page header description
  const contactsData = queryClient.getQueryData<{
    contacts: Contact[];
    total: number;
    personizeAvailable: boolean;
  }>(["contacts", "list"]);

  const isPersonize = personizeAvailable || (contactsData?.personizeAvailable ?? false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={
          isPersonize
            ? "Live contacts from your LinkedIn network via Personize"
            : "Manage contacts with Personize memory integration"
        }
        actions={<ExportButton table="contacts" />}
      />

      <ContactsSubNav />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ContactsClient />
      </HydrationBoundary>
    </div>
  );
}
