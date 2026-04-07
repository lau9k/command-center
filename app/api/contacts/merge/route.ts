import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { logActivity } from "@/lib/activity-logger";
import { mergeContacts } from "@/lib/api/contacts";

const mergeSchema = z.object({
  winnerId: z.string().uuid("winnerId must be a valid UUID"),
  loserId: z.string().uuid("loserId must be a valid UUID"),
  fieldOverrides: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.array(z.string()), z.null()])
    )
    .optional(),
});

/**
 * POST /api/contacts/merge
 * Merges contact B (loser) into contact A (winner).
 * - Applies any field overrides to the winner
 * - Reassigns all FKs (conversations) from loser to winner
 * - Marks the loser with merged_into_id
 * - Logs to activity_log
 */
export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const body = await request.json();
  const parsed = mergeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { winnerId, loserId, fieldOverrides } = parsed.data;

  if (winnerId === loserId) {
    return NextResponse.json(
      { error: "Cannot merge a contact with itself" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  let updatedWinner;
  try {
    updatedWinner = await mergeContacts(supabase, winnerId, loserId, fieldOverrides);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Merge failed";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }

  // Log to activity_log
  await logActivity({
    action: "updated",
    entity_type: "contact",
    entity_id: winnerId,
    entity_name: updatedWinner.name,
    source: "manual",
    metadata: {
      merge: true,
      merged_contact_id: loserId,
    },
  });

  return NextResponse.json({
    data: updatedWinner,
    merged: { winnerId, loserId },
  });
}));
