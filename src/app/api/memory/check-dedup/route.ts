import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

interface CheckDedupBody {
  content_hash: string;
}

export const POST = withErrorHandler(withAuth(async function POST(request, _user) {
  const supabase = createServiceClient();
  const body: CheckDedupBody = await request.json();

  if (!body.content_hash || typeof body.content_hash !== "string") {
    return NextResponse.json({ error: "Missing or invalid content_hash" }, { status: 400 });
  }

  const { data: existing, error } = await supabase
    .from("memory_ingestion_log")
    .select("id, contact_email, source_type, source_ref, content_hash, status, created_at")
    .eq("content_hash", body.content_hash)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ exists: true, existing_log: existing });
  }

  return NextResponse.json({ exists: false });
}));
