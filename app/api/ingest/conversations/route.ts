import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestConversationSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const POST = withRateLimit(withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const rawBody = await request.text();
  const parsed = ingestConversationSchema.safeParse(JSON.parse(rawBody));
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
  const { contact_email, ...conversationData } = parsed.data;

  // Look up contact by email to link the conversation
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", contact_email)
    .single();

  // Upsert by external_id — dedup on Gmail thread ID or Slack channel ID
  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      { ...conversationData, contact_id: contact?.id ?? null },
      { onConflict: "external_id" }
    )
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
    entity_type: "conversation",
    entity_id: data.id,
    entity_name: data.summary,
    source: "n8n",
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}), RATE_LIMITS.ingest);
