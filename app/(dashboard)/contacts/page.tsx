import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const metadata: Metadata = { title: "Contacts" };
import { createServiceClient } from "@/lib/supabase/service";
import type { Contact } from "@/lib/types/database";
import { ContactsClient } from "@/components/dashboard/ContactsClient";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/export/ExportButton";
import { ContactsSubNav } from "@/components/contacts/ContactsSubNav";
import { getQueryClient } from "@/lib/query-client";
import { contactListOptions } from "@/lib/queries/contacts";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createServiceClient();
  const queryClient = getQueryClient();

  // Prefetch contacts list — Supabase-primary (no Personize read path)
  const sharedOpts = contactListOptions();
  await queryClient.prefetchQuery({
    ...sharedOpts,
    queryFn: async () => {
      const contactsRes = await supabase
        .from("contacts")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(0, 49);

      if (contactsRes.error) {
        console.error("[Contacts] Supabase query error:", contactsRes.error.message);
        return { contacts: [], total: 0, personizeAvailable: false, pagination: { page: 1, pageSize: 50, total: 0, hasMore: false } };
      }

      const contacts = (contactsRes.data as Contact[]) ?? [];
      const total = contactsRes.count ?? contacts.length;
      return { contacts, total, personizeAvailable: false, pagination: { page: 1, pageSize: 50, total, hasMore: total > 50 } };
    },
  });

  // Prefetch KPI stats — Supabase-only counts
  await queryClient.prefetchQuery({
    queryKey: ["contacts", "kpis"],
    queryFn: async () => {
      // 1. Total contacts from Supabase
      const { count: totalContacts } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true });

      // 2. Fetch withMemories from Supabase memory_stats
      const { count: withMemories } = await supabase
        .from("memory_stats")
        .select("id", { count: "exact", head: true })
        .gt("count", 0);

      // 3. Fetch tagged-this-week from Supabase contacts
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

      // 4. Untagged contacts
      const untaggedRes = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .or("tags.eq.{},tags.is.null");

      const untagged = untaggedRes.count ?? 0;

      return {
        totalContacts: totalContacts ?? 0,
        taggedThisWeek,
        withMemories: withMemories ?? 0,
        untagged,
      };
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Manage your network — contacts stored in Supabase, enriched by Personize"
        actions={<ExportButton table="contacts" />}
      />

      <ContactsSubNav />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <ContactsClient />
      </HydrationBoundary>
    </div>
  );
}
