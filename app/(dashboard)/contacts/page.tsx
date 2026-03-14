import { createServiceClient } from "@/lib/supabase/service";
import type { Contact } from "@/lib/types/database";
import { ContactsClient } from "@/components/dashboard/ContactsClient";
import { searchContacts } from "@/lib/personize/actions";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExportButton } from "@/components/export/ExportButton";
import { ContactsSubNav } from "@/components/contacts/ContactsSubNav";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  let contacts: Contact[] = [];
  let totalFromPersonize = 0;
  let personizeAvailable = false;

  // Try Personize first for live data
  if (process.env.PERSONIZE_SECRET_KEY) {
    try {
      const result = await searchContacts(undefined, 1, 50, "priority_score");
      contacts = result.contacts;
      totalFromPersonize = result.total;
      personizeAvailable = true;
    } catch (error) {
      console.error("[Contacts] Personize search failed:", error);
      // Fall through to Supabase
    }
  }

  // Supabase fallback + stats
  const supabase = createServiceClient();

  if (!personizeAvailable) {
    const contactsRes = await supabase
      .from("contacts")
      .select("*")
      .order("updated_at", { ascending: false });

    if (contactsRes.error) {
      console.error("[Contacts] Supabase query error:", contactsRes.error.message);
    }
    contacts = (contactsRes.data as Contact[]) ?? [];
  }

  // Fetch tagged-this-week stat from Supabase (always useful)
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
  const totalContacts = personizeAvailable ? totalFromPersonize : contacts.length;
  const withMemories = contacts.filter(
    (c) => c.has_conversation === true || (c.email !== null && c.email !== "")
  ).length;
  const untagged = contacts.filter(
    (c) => !c.tags || c.tags.length === 0
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description={
          personizeAvailable
            ? "Live contacts from your LinkedIn network via Personize"
            : "Manage contacts with Personize memory integration"
        }
        actions={<ExportButton table="contacts" />}
      />

      <ContactsSubNav />

      <ContactsClient
        initialContacts={contacts}
        kpis={{
          totalContacts,
          taggedThisWeek,
          withMemories,
          untagged,
        }}
      />
    </div>
  );
}
