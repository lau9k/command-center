import { NextRequest, NextResponse } from "next/server";
import { smartRecall, smartDigest } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const contactId = request.nextUrl.searchParams.get("contact_id");

  if (!contactId) {
    return NextResponse.json(
      { error: "contact_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("email, name")
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    return NextResponse.json(
      { error: "Contact not found" },
      { status: 404 }
    );
  }

  if (!contact.email) {
    return NextResponse.json(
      { error: "Contact has no email — cannot query Personize" },
      { status: 422 }
    );
  }

  const [recallResult, digestResult] = await Promise.all([
    smartRecall(contact.name, { email: contact.email }),
    smartDigest(contact.name, { email: contact.email, token_budget: 1500 }),
  ]);

  // SmartDigestResponse may include properties depending on the record
  const digestData = digestResult as Record<string, unknown> | null;
  const properties = digestData?.properties as Record<string, string> | undefined;

  return NextResponse.json({
    data: {
      memories: recallResult?.memories ?? [],
      digest: digestResult?.compiledContext ?? null,
      lastInteraction: properties?.last_interaction_date ?? null,
    },
  });
});
