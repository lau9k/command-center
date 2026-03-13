import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { n8nContactPayload } from "@/lib/ingest/n8n-adapters";

export const POST = withRateLimit(withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const rawBody = await request.text();
  const parsed = n8nContactPayload.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const items = parsed.data;
  const supabase = createServiceClient();

  // Upsert by email — update existing contact or insert new one
  const { data, error } = await supabase
    .from("contacts")
    .upsert(items, { onConflict: "email" })
    .select();

  if (error) {
    void logSync("n8n:contacts", "error", 0, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const results = data ?? [];

  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "contact",
      entity_id: row.id,
      entity_name: row.name,
      source: "n8n",
    });
  }

  void logSync("n8n:contacts", "success", results.length);

  return NextResponse.json(
    { success: true, data: results, count: results.length },
    { status: 201 }
  );
}), RATE_LIMITS.ingest);
