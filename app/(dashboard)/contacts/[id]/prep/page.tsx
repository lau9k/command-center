import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { ContactPrepClient } from "@/components/contacts/ContactPrepClient";
import type { DossierResponse } from "@/app/api/contacts/[id]/dossier/route";

export const dynamic = "force-dynamic";

interface PrepPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPrepPage({ params }: PrepPageProps) {
  const { id } = await params;

  const supabase = createServiceClient();

  // Fetch contact
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, name, email, company, phone, role, source, qualified_status, tags, score, notes, last_contact_date, created_at, updated_at")
    .eq("id", id)
    .single();

  if (contactError || !contact) {
    notFound();
  }

  // Fetch related data in parallel
  const [conversationsResult, meetingsResult, tasksResult, pipelineResult] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id, summary, channel, last_message_at, created_at")
        .eq("contact_id", id)
        .order("last_message_at", { ascending: false })
        .limit(50),

      supabase
        .from("meetings")
        .select("id, title, summary, meeting_date, decisions, action_items, attendees")
        .or(
          contact.email
            ? `attendees.cs.[{"name":"${contact.name}"}],attendees.cs.[{"email":"${contact.email}"}]`
            : `attendees.cs.[{"name":"${contact.name}"}]`
        )
        .order("meeting_date", { ascending: false })
        .limit(20),

      supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, created_at")
        .ilike("title", `%${contact.name}%`)
        .order("created_at", { ascending: false })
        .limit(20),

      supabase
        .from("pipeline_items")
        .select("id, title, value, sort_order, created_at, updated_at, pipeline_stages(name, slug, color)")
        .ilike("title", `%${contact.name}%`)
        .order("updated_at", { ascending: false })
        .limit(20),
    ]);

  const dossier: DossierResponse = {
    contact: contact as DossierResponse["contact"],
    conversations: (conversationsResult.data ?? []) as DossierResponse["conversations"],
    meetings: (meetingsResult.data ?? []) as DossierResponse["meetings"],
    tasks: (tasksResult.data ?? []) as DossierResponse["tasks"],
    pipeline_items: (pipelineResult.data ?? []).map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        id: raw.id as string,
        title: raw.title as string,
        value: raw.value as number | null,
        sort_order: raw.sort_order as number,
        created_at: raw.created_at as string,
        updated_at: raw.updated_at as string,
        stage: raw.pipeline_stages as DossierResponse["pipeline_items"][number]["stage"],
      };
    }),
  };

  return (
    <div className="space-y-6">
      <ContactPrepClient dossier={dossier} />
    </div>
  );
}
