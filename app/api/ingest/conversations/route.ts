import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestConversationSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const body = await request.json();

  const parsed = ingestConversationSchema.safeParse(body);
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
  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", contact_email)
    .single();

  if (contactError || !contact) {
    return NextResponse.json(
      {
        success: false,
        error: `Contact not found for email: ${contact_email}`,
      },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ ...conversationData, contact_id: contact.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  // Fire-and-forget: don't block response on logging
  void logActivity({
    action: "ingested",
    entity_type: "conversation",
    entity_id: data.id,
    entity_name: data.subject,
    source: "webhook",
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
});
