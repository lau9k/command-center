import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSecret } from "@/lib/webhook-auth";

const SYNTHETIC_EMAIL = "synthetic-test@personize.internal";

const SYNTHETIC_CONTACT = {
  name: "Synthetic Health Check",
  email: SYNTHETIC_EMAIL,
  phone: null,
  company: "Personize Internal",
  role: "synthetic-test",
  notes: "Automated pipeline health check — this row should be cleaned up automatically.",
  tags: ["synthetic-test"],
  score: 0,
  source: "synthetic",
} as const;

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const supabase = createServiceClient();
  const start = performance.now();

  // 1. Upsert synthetic contact through the contacts table
  const { data: upserted, error: upsertError } = await supabase
    .from("contacts")
    .upsert(SYNTHETIC_CONTACT, { onConflict: "email" })
    .select("id, email, created_at")
    .single();

  if (upsertError) {
    return NextResponse.json(
      {
        success: false,
        result: "fail",
        stage: "write",
        error: upsertError.message,
        latency_ms: Math.round(performance.now() - start),
      },
      { status: 500 }
    );
  }

  // 2. Verify the row exists by reading it back
  const { data: verified, error: readError } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("email", SYNTHETIC_EMAIL)
    .single();

  if (readError || !verified) {
    // Attempt cleanup even on read failure
    await supabase.from("contacts").delete().eq("email", SYNTHETIC_EMAIL);
    return NextResponse.json(
      {
        success: false,
        result: "fail",
        stage: "verify",
        error: readError?.message ?? "Row not found after write",
        latency_ms: Math.round(performance.now() - start),
      },
      { status: 500 }
    );
  }

  // 3. Clean up synthetic row
  const { error: deleteError } = await supabase
    .from("contacts")
    .delete()
    .eq("email", SYNTHETIC_EMAIL);

  const latencyMs = Math.round(performance.now() - start);

  if (deleteError) {
    return NextResponse.json(
      {
        success: true,
        result: "pass",
        warning: `Cleanup failed: ${deleteError.message}`,
        written_id: upserted.id,
        latency_ms: latencyMs,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    success: true,
    result: "pass",
    written_id: upserted.id,
    latency_ms: latencyMs,
  });
});
