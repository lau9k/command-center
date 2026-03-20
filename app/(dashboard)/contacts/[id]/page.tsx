import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { ContactDetailClient } from "@/components/contacts/ContactDetailClient";

export const dynamic = "force-dynamic";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;

  const supabase = createServiceClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select(
      "id, name, email, company, phone, role, source, qualified_status, tags, score, notes, last_contact_date, created_at, updated_at"
    )
    .eq("id", id)
    .single();

  if (error || !contact) {
    notFound();
  }

  return <ContactDetailClient contact={contact} />;
}
