import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

/**
 * POST /api/memory/identity-map/seed
 * Populates the identity map from the top 250 contacts by engagement score.
 * Skips contacts that already have a mapping (by contact_id).
 */
export const POST = withErrorHandler(
  withAuth(async function POST(_request, _user) {
    const supabase = createServiceClient();

    // Fetch top 250 contacts by score (engagement)
    const { data: contacts, error: fetchError } = await supabase
      .from("contacts")
      .select("id, name, email")
      .not("email", "is", null)
      .not("name", "is", null)
      .order("score", { ascending: false })
      .limit(250);

    if (fetchError) throw fetchError;
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ data: { seeded: 0, skipped: 0 } });
    }

    // Fetch existing mappings to avoid duplicates
    const contactIds = contacts.map((c) => c.id);
    const { data: existing } = await supabase
      .from("contact_identity_map")
      .select("contact_id")
      .in("contact_id", contactIds);

    const existingIds = new Set((existing ?? []).map((e) => e.contact_id));

    // Build insert rows for contacts not yet mapped
    const rows = contacts
      .filter((c) => !existingIds.has(c.id) && c.email && c.name)
      .map((c) => ({
        contact_id: c.id,
        primary_email: c.email!.toLowerCase(),
        canonical_name: c.name!,
        aliases: [c.name!.toLowerCase()],
        confidence_score: 1.0,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ data: { seeded: 0, skipped: contacts.length } });
    }

    // Upsert to handle any edge cases with duplicate emails
    const { data: inserted, error: insertError } = await supabase
      .from("contact_identity_map")
      .upsert(rows, { onConflict: "primary_email", ignoreDuplicates: true })
      .select("id");

    if (insertError) throw insertError;

    const seeded = inserted?.length ?? 0;

    return NextResponse.json({
      data: {
        seeded,
        skipped: contacts.length - rows.length,
        total_candidates: contacts.length,
      },
    });
  }),
);
