import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";

const paramsSchema = z.object({
  id: z.string().uuid("Invalid contact ID"),
});

export interface DossierConversation {
  id: string;
  summary: string | null;
  channel: string | null;
  last_message_at: string | null;
  created_at: string;
}

export interface DossierMeeting {
  id: string;
  title: string;
  summary: string | null;
  meeting_date: string | null;
  decisions: string[];
  action_items: { title: string; assignee?: string; due_date?: string }[];
  attendees: { name: string; email?: string; company?: string }[];
}

export interface DossierTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
}

export interface DossierPipelineItem {
  id: string;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  stage: { name: string; slug: string; color: string | null } | null;
}

export interface DossierContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  phone: string | null;
  role: string | null;
  source: string;
  qualified_status: string | null;
  tags: string[];
  score: number;
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DossierResponse {
  contact: DossierContact;
  conversations: DossierConversation[];
  meetings: DossierMeeting[];
  tasks: DossierTask[];
  pipeline_items: DossierPipelineItem[];
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const parsed = paramsSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid contact ID" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    // Fetch contact
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("id, name, email, company, phone, role, source, qualified_status, tags, score, notes, last_contact_date, created_at, updated_at")
      .eq("id", id)
      .single();

    if (contactError) {
      const status = contactError.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        { error: contactError.message },
        { status }
      );
    }

    // Fetch related data in parallel
    const [conversationsResult, meetingsResult, tasksResult, pipelineResult] =
      await Promise.all([
        // Conversations linked via contact_id
        supabase
          .from("conversations")
          .select("id, summary, channel, last_message_at, created_at")
          .eq("contact_id", id)
          .order("last_message_at", { ascending: false })
          .limit(50),

        // Meetings where contact name or email appears in attendees (JSONB)
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

        // Tasks mentioning contact name in title
        supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, created_at")
          .ilike("title", `%${contact.name}%`)
          .order("created_at", { ascending: false })
          .limit(20),

        // Pipeline items mentioning contact name in title
        supabase
          .from("pipeline_items")
          .select("id, title, sort_order, created_at, updated_at, pipeline_stages(name, slug, color)")
          .ilike("title", `%${contact.name}%`)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

    const response: DossierResponse = {
      contact: contact as DossierContact,
      conversations: (conversationsResult.data ?? []) as DossierConversation[],
      meetings: (meetingsResult.data ?? []) as DossierMeeting[],
      tasks: (tasksResult.data ?? []) as DossierTask[],
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
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
