import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { batchOutreachStatusSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const body: unknown = await request.json();

  const parsed = batchOutreachStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { taskIds, outreach_status, sent_at } = parsed.data;

  const updates: Record<string, unknown> = { outreach_status };
  if (sent_at !== undefined) {
    updates.sent_at = sent_at;
  } else if (outreach_status === "sent") {
    updates.sent_at = new Date().toISOString();
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .in("id", taskIds)
    .select("*, projects(id, name, color)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, updated: data?.length ?? 0 });
}));
