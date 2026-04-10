import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

const VALID_SOURCE_TYPES = ["decisions", "session_note", "call_transcript", "intake_file", "manual"] as const;
const VALID_STATUSES = ["pending", "sent", "confirmed", "failed"] as const;

type SourceType = (typeof VALID_SOURCE_TYPES)[number];
type Status = (typeof VALID_STATUSES)[number];

export const GET = withErrorHandler(withAuth(async function GET(request, _user) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const contactEmail = searchParams.get("contact_email");
  const sourceType = searchParams.get("source_type");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const offset = Number(searchParams.get("offset") ?? 0);

  let query = supabase
    .from("memory_ingestion_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (contactEmail) {
    query = query.eq("contact_email", contactEmail);
  }

  if (sourceType) {
    query = query.eq("source_type", sourceType);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, count, limit, offset });
}));

interface IngestionLogBody {
  contact_id?: string;
  contact_email?: string;
  source_type: SourceType;
  source_ref: string;
  content_hash: string;
  personize_event_id?: string;
  status?: Status;
  payload_preview?: string;
}

export const POST = withErrorHandler(withAuth(async function POST(request, _user) {
  const supabase = createServiceClient();
  const body: IngestionLogBody = await request.json();

  if (!body.source_type || !VALID_SOURCE_TYPES.includes(body.source_type)) {
    return NextResponse.json(
      { error: "Invalid or missing source_type", valid: VALID_SOURCE_TYPES },
      { status: 400 },
    );
  }

  if (!body.source_ref) {
    return NextResponse.json({ error: "Missing source_ref" }, { status: 400 });
  }

  if (!body.content_hash) {
    return NextResponse.json({ error: "Missing content_hash" }, { status: 400 });
  }

  if (body.status && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: "Invalid status", valid: VALID_STATUSES },
      { status: 400 },
    );
  }

  // Check for duplicate content_hash before inserting
  const { data: existing } = await supabase
    .from("memory_ingestion_log")
    .select("id, content_hash, source_ref, status, created_at")
    .eq("content_hash", body.content_hash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "Content already ingested", existing },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("memory_ingestion_log")
    .insert({
      contact_id: body.contact_id ?? null,
      contact_email: body.contact_email ?? null,
      source_type: body.source_type,
      source_ref: body.source_ref,
      content_hash: body.content_hash,
      personize_event_id: body.personize_event_id ?? null,
      status: body.status ?? "pending",
      payload_preview: body.payload_preview?.slice(0, 200) ?? null,
    })
    .select("*")
    .single();

  if (error) {
    // Handle unique constraint violation at DB level as a fallback
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Content already ingested (duplicate content_hash)" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}));
