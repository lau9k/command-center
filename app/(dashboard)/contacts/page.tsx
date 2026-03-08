import { createServiceClient } from "@/lib/supabase/service";
import type { Contact } from "@/lib/types/database";
import { ContactsClient } from "@/components/dashboard/ContactsClient";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createServiceClient();

  const [contactsRes, taggedThisWeekRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .order("updated_at", { ascending: false }),
    (() => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .gte("updated_at", oneWeekAgo.toISOString())
        .not("tags", "eq", "{}");
    })(),
  ]);

  const contacts = (contactsRes.data as Contact[]) ?? [];
  const taggedThisWeek = taggedThisWeekRes.count ?? 0;

  const totalContacts = contacts.length;
  const withMemories = contacts.filter(
    (c) => c.email !== null && c.email !== ""
  ).length;
  const untagged = contacts.filter(
    (c) => !c.tags || c.tags.length === 0
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage contacts with Personize memory integration
        </p>
      </div>

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
