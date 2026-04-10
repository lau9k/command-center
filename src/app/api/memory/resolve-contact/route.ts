import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { z } from "zod";

const resolveSchema = z.object({
  query: z.string().min(1).max(500),
});

/**
 * POST /api/memory/resolve-contact
 * Resolves a name/email mention to a specific contact record.
 * Searches identity map first (canonical_name, aliases, emails),
 * then falls back to contacts table text search.
 */
export const POST = withErrorHandler(
  withAuth(async function POST(request, _user) {
    const body = await request.json();
    const parsed = resolveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { query } = parsed.data;
    const supabase = createServiceClient();
    const q = query.trim().toLowerCase();

    // 1. Exact email match
    const { data: emailMatch } = await supabase
      .from("contact_identity_map")
      .select("*, contacts:contact_id(*)")
      .eq("primary_email", q)
      .limit(1)
      .maybeSingle();

    if (emailMatch) {
      return NextResponse.json({ data: emailMatch, source: "identity_map", match_type: "email_exact" });
    }

    // 2. Alternate email match
    const { data: altEmailMatch } = await supabase
      .from("contact_identity_map")
      .select("*, contacts:contact_id(*)")
      .contains("alternate_emails", [q])
      .limit(1)
      .maybeSingle();

    if (altEmailMatch) {
      return NextResponse.json({ data: altEmailMatch, source: "identity_map", match_type: "email_alternate" });
    }

    // 3. Canonical name (case-insensitive)
    const { data: nameMatch } = await supabase
      .from("contact_identity_map")
      .select("*, contacts:contact_id(*)")
      .ilike("canonical_name", q)
      .limit(1)
      .maybeSingle();

    if (nameMatch) {
      return NextResponse.json({ data: nameMatch, source: "identity_map", match_type: "canonical_name" });
    }

    // 4. Alias match (GIN array containment — case-sensitive, so we store lowercase)
    const { data: aliasMatches } = await supabase
      .from("contact_identity_map")
      .select("*, contacts:contact_id(*)")
      .contains("aliases", [q])
      .limit(1);

    if (aliasMatches && aliasMatches.length > 0) {
      return NextResponse.json({ data: aliasMatches[0], source: "identity_map", match_type: "alias" });
    }

    // 5. Partial name match on identity map
    const { data: partialMatch } = await supabase
      .from("contact_identity_map")
      .select("*, contacts:contact_id(*)")
      .ilike("canonical_name", `%${q}%`)
      .order("confidence_score", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (partialMatch) {
      return NextResponse.json({ data: partialMatch, source: "identity_map", match_type: "partial_name" });
    }

    // 6. Fallback — text search on contacts table
    const { data: contactMatch } = await supabase
      .from("contacts")
      .select("*")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (contactMatch) {
      return NextResponse.json({ data: contactMatch, source: "contacts_fallback", match_type: "text_search" });
    }

    return NextResponse.json({ data: null, source: "none", match_type: "no_match" });
  }),
);
