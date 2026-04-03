import { NextRequest, NextResponse } from "next/server";
import client from "@/lib/personize/client";
import { createServiceClient } from "@/lib/supabase/service";

export interface GmailContextResponse {
  gmail_threads: number;
  gmail_messages: number;
  gmail_earliest: string | null;
  gmail_latest: string | null;
  lautaro_sent: boolean;
  subjects: string[];
  gmail_context_stored: boolean;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const isPersonizeId = id.startsWith("REC#") || id.startsWith("REC%23");

  let contactEmail: string | null = null;

  if (isPersonizeId) {
    // For Personize-sourced contacts, we don't have a guaranteed email.
    // Return empty gmail context rather than 404.
    return NextResponse.json({
      data: {
        gmail_threads: 0,
        gmail_messages: 0,
        gmail_earliest: null,
        gmail_latest: null,
        lautaro_sent: false,
        subjects: [],
        gmail_context_stored: false,
      } as GmailContextResponse,
    });
  }

  const supabase = createServiceClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("email, name")
    .eq("id", id)
    .single();

  if (error || !contact) {
    return NextResponse.json(
      { error: "Contact not found" },
      { status: 404 }
    );
  }

  contactEmail = contact.email;

  if (!contactEmail) {
    return NextResponse.json(
      { error: "Contact has no email — cannot query Personize" },
      { status: 422 }
    );
  }

  try {
    const response = await client.memory.smartRecall({
      query: "gmail communication history email threads",
      email: contactEmail,
      include_property_values: true,
      fast_mode: true,
      min_score: 0.2,
    });

    const data = response.data as {
      memories?: Array<{
        properties?: Record<string, string>;
      }>;
    } | null;

    // Extract gmail properties from the first memory with property values
    const memories = data?.memories ?? [];
    let props: Record<string, string> = {};
    for (const mem of memories) {
      if (mem.properties) {
        props = { ...props, ...mem.properties };
      }
    }

    const gmailContext: GmailContextResponse = {
      gmail_threads: parseInt(props.gmail_threads ?? "0", 10) || 0,
      gmail_messages: parseInt(props.gmail_messages ?? "0", 10) || 0,
      gmail_earliest: props.gmail_earliest ?? null,
      gmail_latest: props.gmail_latest ?? null,
      lautaro_sent: props.lautaro_sent === "true" || props.lautaro_sent === "True",
      subjects: props.subjects_summary
        ? props.subjects_summary.split("|").map((s) => s.trim()).filter(Boolean).slice(0, 5)
        : [],
      gmail_context_stored:
        props.gmail_context_stored === "true" || props.gmail_context_stored === "True",
    };

    return NextResponse.json({ data: gmailContext });
  } catch (err) {
    console.error("[API] /api/contacts/[id]/gmail failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
