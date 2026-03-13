import { NextRequest, NextResponse } from "next/server";
import { smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";
import type { SmartRecallResult } from "@/lib/personize/types";

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

    const recallData = result as SmartRecallResult | null;
    const memories = recallData?.memories ?? [];

    // Categorize memories into pain points, interests, and interactions
    const painPoints: string[] = [];
    const interests: string[] = [];
    const recentInteractions: Array<{
      text: string;
      timestamp: string | null;
      type: string;
      score: number;
    }> = [];

    for (const mem of memories) {
      const lower = mem.text.toLowerCase();
      const isInteraction =
        mem.type === "conversation" ||
        mem.type === "meeting" ||
        mem.type === "email" ||
        !!mem.timestamp;

      if (
        lower.includes("pain") ||
        lower.includes("challenge") ||
        lower.includes("problem") ||
        lower.includes("struggle") ||
        lower.includes("frustrat") ||
        lower.includes("concern") ||
        lower.includes("issue")
      ) {
        painPoints.push(mem.text);
      } else if (
        lower.includes("interest") ||
        lower.includes("excited") ||
        lower.includes("passion") ||
        lower.includes("hobby") ||
        lower.includes("enjoy") ||
        lower.includes("prefer")
      ) {
        interests.push(mem.text);
      }

      if (isInteraction) {
        recentInteractions.push({
          text: mem.text,
          timestamp: mem.timestamp,
          type: mem.type,
          score: mem.score,
        });
      }
    }

    // Build AI summary from top-scoring direct matches
    const directMatches = memories
      .filter((m) => m.relevance_tier === "direct")
      .slice(0, 3);
    const summary =
      directMatches.length > 0
        ? directMatches.map((m) => m.text).join(" ")
        : null;

    return NextResponse.json({
      data: {
        summary,
        painPoints: painPoints.slice(0, 5),
        interests: interests.slice(0, 5),
        recentInteractions: recentInteractions.slice(0, 5),
        totalMemories: memories.length,
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
