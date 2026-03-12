import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { logActivity } from "@/lib/activity-logger";

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
 * - Soft-deletes the loser with deleted_at + merged_into_id
 * - Logs to activity_log
 */
export const POST = withErrorHandler(async function POST(request: NextRequest) {
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

  // Fetch both contacts
  const [winnerRes, loserRes] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", winnerId).is("deleted_at", null).single(),
    supabase.from("contacts").select("*").eq("id", loserId).is("deleted_at", null).single(),
  ]);

  if (winnerRes.error || !winnerRes.data) {
    return NextResponse.json({ error: "Winner contact not found" }, { status: 404 });
  }
  if (loserRes.error || !loserRes.data) {
    return NextResponse.json({ error: "Loser contact not found" }, { status: 404 });
  }

  const winner = winnerRes.data;
  const loser = loserRes.data;

  // Build update payload for the winner
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Merge tags (union, deduplicate)
  const mergedTags = Array.from(
    new Set([...(winner.tags ?? []), ...(loser.tags ?? [])])
  );
  updatePayload.tags = mergedTags;

  // Merge notes
  if (loser.notes && loser.notes.trim()) {
    const winnerNotes = winner.notes ?? "";
    updatePayload.notes = winnerNotes
      ? `${winnerNotes}\n\n--- Merged from ${loser.name} ---\n\n${loser.notes}`
      : loser.notes;
  }

  // Take higher score
  if ((loser.score ?? 0) > (winner.score ?? 0)) {
    updatePayload.score = loser.score;
  }

  // Fill in missing fields from loser
  const fillableFields = ["email", "phone", "company", "role", "last_contact_date"] as const;
  for (const field of fillableFields) {
    if (!winner[field] && loser[field]) {
      updatePayload[field] = loser[field];
    }
  }

  // Apply explicit field overrides (user picked "winner" for each field)
  if (fieldOverrides) {
    for (const [key, value] of Object.entries(fieldOverrides)) {
      updatePayload[key] = value;
    }
  }

  // 1. Update winner with merged data
  const { error: updateError } = await supabase
    .from("contacts")
    .update(updatePayload)
    .eq("id", winnerId);

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to update winner: ${updateError.message}` },
      { status: 500 }
    );
  }

  // 2. Reassign conversations FK
  const { error: convError } = await supabase
    .from("conversations")
    .update({ contact_id: winnerId })
    .eq("contact_id", loserId);

  if (convError) {
    // Non-fatal — log but continue
    console.error("[merge] Failed to reassign conversations:", convError.message);
  }

  // 3. Soft-delete the loser
  const { error: softDeleteError } = await supabase
    .from("contacts")
    .update({
      deleted_at: new Date().toISOString(),
      merged_into_id: winnerId,
    })
    .eq("id", loserId);

  if (softDeleteError) {
    return NextResponse.json(
      { error: `Failed to soft-delete loser: ${softDeleteError.message}` },
      { status: 500 }
    );
  }

  // 4. Log to activity_log
  await logActivity({
    action: "updated",
    entity_type: "contact",
    entity_id: winnerId,
    entity_name: winner.name,
    source: "manual",
    metadata: {
      merge: true,
      merged_contact_id: loserId,
      merged_contact_name: loser.name,
    },
  });

  // Fetch updated winner
  const { data: updatedWinner } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", winnerId)
    .single();

  return NextResponse.json({
    data: updatedWinner,
    merged: { winnerId, loserId, loserName: loser.name },
  });
});
