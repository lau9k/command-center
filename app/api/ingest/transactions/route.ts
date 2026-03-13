import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { logSync } from "@/lib/gmail-sync-log";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { n8nTransactionPayload } from "@/lib/ingest/n8n-adapters";

export const POST = withRateLimit(withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const rawBody = await request.text();
  const parsed = n8nTransactionPayload.safeParse(JSON.parse(rawBody));
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

  // Upsert by external_id (Plaid transaction ID) for deduplication
  const { data, error } = await supabase
    .from("transactions")
    .upsert(items, { onConflict: "external_id" })
    .select();

  if (error) {
    void logSync("n8n:transactions", "error", 0, error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  const results = data ?? [];

  for (const row of results) {
    void logActivity({
      action: "ingested",
      entity_type: "transaction",
      entity_id: row.id,
      entity_name: row.name,
      source: "n8n",
    });
  }

  void logSync("n8n:transactions", "success", results.length);

  return NextResponse.json(
    { success: true, data: results, count: results.length },
    { status: 201 }
  );
}), RATE_LIMITS.ingest);
