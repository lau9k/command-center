import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
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

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("ingest_events")
    .insert({
      entity_type: "transaction",
      payload: parsed.data,
      status: "received",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, event_id: data.id },
    { status: 202 }
  );
}), RATE_LIMITS.ingest);
