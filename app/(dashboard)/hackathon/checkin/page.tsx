import { createServiceClient } from "@/lib/supabase/service";
import { CheckInClient } from "@/components/hackathon/CheckInClient";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Contact } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function HackathonCheckInPage() {
  const supabase = createServiceClient();

  // Fetch contacts tagged as "Hackathon"
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .contains("tags", ["Hackathon"])
    .order("name", { ascending: true });

  if (error) {
    console.error("[HackathonCheckIn] query error:", error.message);
  }

  const contacts = (data as Contact[]) ?? [];
  const checkedInCount = contacts.filter((c) => c.checked_in_at).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hackathon Check-In"
        description={`${checkedInCount} / ${contacts.length} checked in`}
      />
      <CheckInClient initialContacts={contacts} />
    </div>
  );
}
