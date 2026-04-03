import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isPersonizeId } from "@/lib/personize/id-guard";
import { z } from "zod";
import type {
  DossierResponse,
  DossierPipelineItem,
} from "@/app/api/contacts/[id]/dossier/route";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid contact ID"),
});

export interface PrepResponse extends DossierResponse {
  activity_log: ActivityEntry[];
}

export interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // For Personize-sourced contacts, return empty prep data (no Supabase relations)
  if (isPersonizeId(id)) {
    const decodedId = decodeURIComponent(id);
    const emptyResponse: PrepResponse = {
      contact: {
        id: decodedId,
        name: "Contact",
        email: null,
        company: null,
        phone: null,
        role: null,
        source: "personize",
        qualified_status: null,
        tags: [],
        score: 0,
        notes: null,
        last_contact_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      conversations: [],
      meetings: [],
      tasks: [],
      pipeline_items: [],
      activity_log: [],
    };
    return NextResponse.json(emptyResponse);
  }

  const parsed = paramsSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid contact ID" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select(
        "id, name, email, company, phone, role, source, qualified_status, tags, score, notes, last_contact_date, created_at, updated_at"
      )
      .eq("id", id)
      .single();

    if (contactError) {
      const status = contactError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        { error: contactError.message },
        { status }
      );
    }

    const [
      conversationsResult,
      meetingsResult,
      tasksResult,
      pipelineResult,
      activityResult,
    ] = await Promise.all([
      supabase
        .from("conversations")
        .select("id, summary, channel, last_message_at, created_at")
        .eq("contact_id", id)
        .order("last_message_at", { ascending: false })
        .limit(50),

      supabase
        .from("meetings")
        .select(
          "id, title, summary, meeting_date, decisions, action_items, attendees"
        )
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
        .select(
          "id, title, sort_order, created_at, updated_at, pipeline_stages(name, slug, color)"
        )
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

    const response: PrepResponse = {
      contact: contact as PrepResponse["contact"],
      conversations: (conversationsResult.data ??
        []) as PrepResponse["conversations"],
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
      activity_log: (activityResult.data ?? []) as ActivityEntry[],
    };

    return NextResponse.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
