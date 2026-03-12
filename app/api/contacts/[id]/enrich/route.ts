import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { smartRecall, smartDigest } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";

const querySchema = z.object({
  q: z.string().min(1).max(500).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ q: searchParams.get("q") || undefined });
  const query = parsed.success ? parsed.data.q : undefined;

  // For Personize-native contacts (record IDs), use record_id directly
  const isPersonizeId = id.startsWith("REC#") || id.length > 36;

  let contactName = "contact";
  let contactEmail: string | null = null;
  let recordId: string | null = null;

  if (isPersonizeId) {
    recordId = id;
  } else {
    const supabase = createServiceClient();
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("email, name, record_id")
      .eq("id", id)
      .single();

    if (error || !contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    contactName = contact.name;
    contactEmail = contact.email;
    recordId = (contact as Record<string, unknown>).record_id as string | null;
  }

  try {
    // Run smartDigest and smartRecall in parallel
    const recallQuery = query ?? contactName;
    const [digestResult, recallResult] = await Promise.all([
      recordId
        ? smartDigest(contactName, { record_id: recordId, token_budget: 3000 })
        : contactEmail
          ? smartDigest(contactName, { email: contactEmail, token_budget: 3000 })
          : Promise.resolve(null),
      smartRecall(recallQuery, {
        ...(contactEmail ? { email: contactEmail } : {}),
      }),
    ]);

    // Extract properties from digest
    const digestData = digestResult as {
      compiledContext?: string;
      properties?: Record<string, string>;
      memories?: Array<{ id: string; text: string; createdAt: string }>;
      tokenEstimate?: number;
    } | null;

    const recallData = recallResult as {
      success?: boolean;
      memories?: Array<{
        id: string;
        text: string;
        score: number;
        relevance_tier: string;
        record_id: string | null;
        type: string;
        topic: string;
        timestamp: string | null;
      }>;
    } | null;

    return NextResponse.json({
      data: {
        digest: digestData
          ? {
              summary: digestData.compiledContext ?? null,
              properties: digestData.properties ?? {},
              memories: digestData.memories ?? [],
              tokenEstimate: digestData.tokenEstimate ?? 0,
            }
          : null,
        recall: {
          query: recallQuery,
          memories: recallData?.memories ?? [],
        },
      },
    });
  } catch (err) {
    console.error("[API] /api/contacts/[id]/enrich failed:", err);
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
