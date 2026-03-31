import { NextRequest, NextResponse } from "next/server";
import { smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";
import type { SmartRecallRecord } from "@/lib/personize/types";

function scoreTier(score: number): "direct" | "partial" | "might" {
  if (score >= 0.8) return "direct";
  if (score >= 0.5) return "partial";
  return "might";
}

function flattenRecordTexts(record: SmartRecallRecord): string[] {
  return record.memories;
}

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

  // Look up contact email from Supabase
  const supabase = createServiceClient();
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("email, name")
    .eq("id", id)
    .single();

  if (error || !contact) {
    return NextResponse.json(
      { error: "Contact not found" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || contact.name;

  try {
    const result = await smartRecall(query, {
      ...(contact.email ? { email: contact.email } : {}),
    });

    const records = result?.records ?? [];

    // Categorize memories into pain points, interests, and interactions
    const painPoints: string[] = [];
    const interests: string[] = [];
    const recentInteractions: Array<{
      text: string;
      timestamp: string | null;
      type: string;
      score: number;
      tier: "direct" | "partial" | "might";
    }> = [];

    for (const record of records) {
      const tier = scoreTier(record.score);
      const texts = flattenRecordTexts(record);

      for (const text of texts) {
        const lower = text.toLowerCase();

        if (
          lower.includes("pain") ||
          lower.includes("challenge") ||
          lower.includes("problem") ||
          lower.includes("struggle") ||
          lower.includes("frustrat") ||
          lower.includes("concern") ||
          lower.includes("issue")
        ) {
          painPoints.push(text);
        } else if (
          lower.includes("interest") ||
          lower.includes("excited") ||
          lower.includes("passion") ||
          lower.includes("hobby") ||
          lower.includes("enjoy") ||
          lower.includes("prefer")
        ) {
          interests.push(text);
        }
      }

      const props = record.properties ?? {};
      const recordType = props.type ?? "unknown";
      const isInteraction =
        recordType === "conversation" ||
        recordType === "meeting" ||
        recordType === "email" ||
        !!props.timestamp;

      if (isInteraction) {
        recentInteractions.push({
          text: texts.join(" "),
          timestamp: props.timestamp ?? null,
          type: recordType,
          score: record.score,
          tier,
        });
      }
    }

    // Build AI summary from top-scoring direct matches
    const directRecords = records
      .filter((r) => scoreTier(r.score) === "direct")
      .slice(0, 3);
    const summary =
      directRecords.length > 0
        ? directRecords.flatMap(flattenRecordTexts).join(" ")
        : result?.answer ?? null;

    return NextResponse.json({
      data: {
        summary,
        painPoints: painPoints.slice(0, 5),
        interests: interests.slice(0, 5),
        recentInteractions: recentInteractions.slice(0, 5),
        totalRecords: records.length,
        query,
      },
    });
  } catch (err) {
    console.error("[API] /api/contacts/[id]/recall failed:", err);
    return NextResponse.json(
      { error: "Recall failed" },
      { status: 500 }
    );
  }
}
