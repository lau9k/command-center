import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { n8nConversationPayload } from "@/lib/ingest/n8n-adapters";

export const POST = withRateLimit(withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const rawBody = await request.text();
  const parsed = n8nConversationPayload.safeParse(JSON.parse(rawBody));
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

  // Batch-lookup contacts by email
  const emails = [...new Set(items.map((c) => c.contact_email))];
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, email")
    .in("email", emails);

  const emailToId = new Map<string, string>();
  for (const c of contacts ?? []) {
    if (c.email) emailToId.set(c.email, c.id);
  }

  // Build upsert rows with contact_id resolved
  const rows = items.map(({ contact_email, ...rest }) => ({
    ...rest,
    contact_id: emailToId.get(contact_email) ?? null,
  }));

  // Upsert by external_id — dedup on Gmail thread ID or Slack channel ID
  const { data, error } = await supabase
    .from("conversations")
    .upsert(rows, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:conversations", "error", 0, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const results = data ?? [];

  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "conversation",
      entity_id: row.id,
      entity_name: row.summary,
      source: "n8n",
    });
  }

  void logSync("n8n:conversations", "success", results.length);

  return NextResponse.json(
    { success: true, data: results, count: results.length },
    { status: 201 }
  );
}), RATE_LIMITS.ingest);
