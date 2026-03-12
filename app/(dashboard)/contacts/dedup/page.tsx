import { PageHeader } from "@/components/shared/PageHeader";
import { ContactsSubNav } from "@/components/contacts/ContactsSubNav";
import { DedupClient } from "@/components/contacts/DedupClient";

export const dynamic = "force-dynamic";

export default function DedupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Find and merge duplicate contacts"
      />
      <ContactsSubNav />
      <DedupClient />
    </div>
  );
}
