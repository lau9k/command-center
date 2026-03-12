import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestContactSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSignature } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const { error: authError, body: rawBody } =
    await validateWebhookSignature(request);
  if (authError) return authError;

  const parsed = ingestContactSchema.safeParse(JSON.parse(rawBody));
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

  // Upsert by email — update existing contact or insert new one
  const { data, error } = await supabase
    .from("contacts")
    .upsert(parsed.data, { onConflict: "email" })
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
    entity_type: "contact",
    entity_id: data.id,
    entity_name: data.name,
    source: "n8n",
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
});
