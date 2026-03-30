import { NextRequest, NextResponse } from "next/server";
import { smartDigest, smartRecall } from "@/lib/personize/actions";
import { createServiceClient } from "@/lib/supabase/service";

interface BriefingInteraction {
  text: string;
  date: string | null;
  type: string;
  topic: string;
}

interface BriefingData {
  contact: {
    name: string;
    email: string | null;
    company: string | null;
    role: string | null;
    score: number;
    last_contact_date: string | null;
    days_since_contact: number | null;
  };
  summary: string | null;
  properties: Record<string, string>;
  recent_interactions: BriefingInteraction[];
  commitments: BriefingInteraction[];
  interests: BriefingInteraction[];
  relationship_health: {
    score: number;
    label: "strong" | "healthy" | "needs-attention" | "at-risk";
    factors: string[];
  };
  generated_at: string;
}

function calculateRelationshipHealth(
  contactScore: number,
  daysSinceContact: number | null,
  interactionCount: number,
  hasDigest: boolean
): BriefingData["relationship_health"] {
  let score = 0;
  const factors: string[] = [];

  // Base score from contact score (0-100 -> 0-30 points)
  const basePoints = Math.round((contactScore / 100) * 30);
  score += basePoints;
  if (contactScore >= 70) factors.push("High contact score");
  else if (contactScore < 30) factors.push("Low contact score");

  // Recency factor (0-30 points)
  if (daysSinceContact === null) {
    factors.push("No recorded interactions");
  } else if (daysSinceContact <= 7) {
    score += 30;
    factors.push("Recent contact (within 7 days)");
  } else if (daysSinceContact <= 14) {
    score += 25;
    factors.push("Contacted within 2 weeks");
  } else if (daysSinceContact <= 30) {
    score += 15;
    factors.push("Contacted within 30 days");
  } else if (daysSinceContact <= 60) {
    score += 5;
    factors.push("Over 30 days since last contact");
  } else {
    factors.push("Over 60 days since last contact");
  }

  // Interaction depth (0-20 points)
  if (interactionCount >= 5) {
    score += 20;
    factors.push("Rich interaction history");
  } else if (interactionCount >= 3) {
    score += 15;
  } else if (interactionCount >= 1) {
    score += 8;
    factors.push("Limited interaction history");
  } else {
    factors.push("No interaction data");
  }

  // AI data availability (0-20 points)
  if (hasDigest) {
    score += 20;
    factors.push("AI-enriched profile");
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  let label: BriefingData["relationship_health"]["label"];
  if (score >= 75) label = "strong";
  else if (score >= 50) label = "healthy";
  else if (score >= 25) label = "needs-attention";
  else label = "at-risk";

  return { score, label, factors };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch contact from Supabase
  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !contact) {
    return NextResponse.json(
      { error: "Contact not found" },
      { status: 404 }
    );
  }

  // Calculate days since last contact
  const daysSinceContact = contact.last_contact_date
    ? Math.floor(
        (Date.now() - new Date(contact.last_contact_date).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Try Personize enrichment, gracefully fall back to local data
  let summary: string | null = null;
  let properties: Record<string, string> = {};
  let recentInteractions: BriefingInteraction[] = [];
  let commitments: BriefingInteraction[] = [];
  let interests: BriefingInteraction[] = [];
  let hasDigest = false;

  if (process.env.PERSONIZE_SECRET_KEY) {
    try {
      const recordId = (contact as Record<string, unknown>).record_id as string | null;
      const [digestResult, recallResult] = await Promise.all([
        recordId
          ? smartDigest(contact.name, { record_id: recordId, token_budget: 3000 })
          : contact.email
            ? smartDigest(contact.name, { email: contact.email, token_budget: 3000 })
            : Promise.resolve(null),
        smartRecall(contact.name, {
          ...(contact.email ? { email: contact.email } : {}),
        }),
      ]);

      const digest = digestResult as {
        compiledContext?: string;
        properties?: Record<string, string>;
        memories?: Array<{ id: string; text: string; createdAt: string }>;
      } | null;

      const recall = recallResult as {
        records?: Array<{
          recordId: string;
          displayName: string;
          score: number;
          properties: Record<string, string>;
          memories: string[];
        }>;
        answer?: string;
      } | null;

      if (digest) {
        hasDigest = true;
        summary = digest.compiledContext ?? null;
        properties = digest.properties ?? {};
      }

      const records = recall?.records ?? [];

      // Flatten records into memory entries with score-based tiers
      const flatMemories = records.flatMap((r) => {
        const tier = r.score >= 0.8 ? "direct" : r.score >= 0.5 ? "partial" : "might";
        const props = r.properties ?? {};
        return r.memories.map((text) => ({
          text,
          score: r.score,
          tier,
          type: props.type ?? "unknown",
          topic: props.topic ?? null,
          timestamp: props.timestamp ?? null,
        }));
      });

      // Categorize memories for briefing
      recentInteractions = flatMemories
        .filter((m) => m.tier === "direct")
        .slice(0, 3)
        .map((m) => ({
          text: m.text,
          date: m.timestamp,
          type: m.type,
          topic: m.topic,
        }));

      commitments = flatMemories
        .filter(
          (m) =>
            m.topic?.toLowerCase().includes("commitment") ||
            m.topic?.toLowerCase().includes("action") ||
            m.topic?.toLowerCase().includes("task") ||
            m.text.toLowerCase().includes("agreed to") ||
            m.text.toLowerCase().includes("will do") ||
            m.text.toLowerCase().includes("promised")
        )
        .slice(0, 5)
        .map((m) => ({
          text: m.text,
          date: m.timestamp,
          type: m.type,
          topic: m.topic,
        }));

      interests = flatMemories
        .filter(
          (m) =>
            m.topic?.toLowerCase().includes("interest") ||
            m.topic?.toLowerCase().includes("preference") ||
            m.topic?.toLowerCase().includes("concern") ||
            m.topic?.toLowerCase().includes("objection")
        )
        .slice(0, 5)
        .map((m) => ({
          text: m.text,
          date: m.timestamp,
          type: m.type,
          topic: m.topic,
        }));
    } catch (err) {
      console.error("[API] /api/contacts/[id]/briefing Personize failed:", err);
      // Continue with local-only data
    }
  }

  const relationshipHealth = calculateRelationshipHealth(
    contact.score ?? 0,
    daysSinceContact,
    recentInteractions.length,
    hasDigest
  );

  const briefing: BriefingData = {
    contact: {
      name: contact.name,
      email: contact.email,
      company: contact.company,
      role: contact.role,
      score: contact.score ?? 0,
      last_contact_date: contact.last_contact_date,
      days_since_contact: daysSinceContact,
    },
    summary,
    properties,
    recent_interactions: recentInteractions,
    commitments,
    interests,
    relationship_health: relationshipHealth,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json({ data: briefing });
}
