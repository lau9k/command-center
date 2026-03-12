import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestTransactionSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSignature } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const POST = withRateLimit(withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const parsed = ingestTransactionSchema.safeParse(JSON.parse(rawBody));
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

  const supabase = createServiceClient();

  // Upsert by external_id (Plaid transaction ID) for deduplication
  const { data, error } = await supabase
    .from("transactions")
    .upsert(parsed.data, { onConflict: "external_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  void logActivity({
    action: "ingested",
    entity_type: "transaction",
    entity_id: data.id,
    entity_name: data.name,
    source: "n8n",
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}), RATE_LIMITS.ingest);
