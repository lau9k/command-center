import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { z } from "zod";

const patchSchema = z.object({
  status: z.enum(["pending", "completed", "skipped"]),
});

/**
 * PATCH /api/meetings/actions/[id] — Update a meeting action's status
 */
export const PATCH = withErrorHandler(withAuth(async function PATCH(
  request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> }
) {
  const params = await context!.params;
  const id = params.id;

  const uuidResult = z.string().uuid().safeParse(id);
  if (!uuidResult.success) {
    return NextResponse.json({ error: "Invalid action ID" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("meeting_actions")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}));
