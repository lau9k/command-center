import { createServiceClient } from "@/lib/supabase/service";
import { notFound } from "next/navigation";
import { ContactPrepClient } from "@/components/contacts/ContactPrepClient";
import type { DossierPipelineItem } from "@/app/api/contacts/[id]/dossier/route";
import type { PrepResponse } from "@/app/api/contacts/[id]/prep/route";

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

  // Fetch all related data in parallel
  const [conversationsResult, meetingsResult, tasksResult, pipelineResult, activityResult] =
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

      supabase
        .from("activity_log")
        .select("id, action, entity_type, entity_id, metadata, created_at")
        .eq("entity_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  const prepData: PrepResponse = {
    contact: contact as PrepResponse["contact"],
    conversations: (conversationsResult.data ?? []) as PrepResponse["conversations"],
    meetings: (meetingsResult.data ?? []) as PrepResponse["meetings"],
    tasks: (tasksResult.data ?? []) as PrepResponse["tasks"],
    pipeline_items: (pipelineResult.data ?? []).map((item) => {
      const raw = item as Record<string, unknown>;
      return {
        id: raw.id as string,
        title: raw.title as string,
        sort_order: raw.sort_order as number,
        created_at: raw.created_at as string,
        updated_at: raw.updated_at as string,
        stage: raw.pipeline_stages as DossierPipelineItem["stage"],
      };
    }),
    activity_log: (activityResult.data ?? []) as PrepResponse["activity_log"],
  };

  return (
    <div className="space-y-6">
      <ContactPrepClient prepData={prepData} />
    </div>
  );
}
