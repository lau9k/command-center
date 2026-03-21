import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import client from "@/lib/personize/client";
import {
  extractScoreInputs,
  computeRelationshipScore,
} from "@/lib/personize/relationship-score";
import type { ScoreBreakdown } from "@/lib/personize/relationship-score";
import {
  getCachedContext,
  setCachedContext,
  isCacheFresh,
  computeInputHash,
} from "@/lib/ai/cache";

const CONTACTS_COLLECTION_ID =
  process.env.PERSONIZE_CONTACTS_COLLECTION_ID ??
  "8ef5a304-05b0-4f06-9660-fb948b9fa5d9";

const CACHE_USER_ID = "system";
const CACHE_VIEW_TYPE = "relationship_scores";
const CACHE_TTL_MINUTES = 120;

interface ScoredContact {
  email: string | null;
  name: string;
  company: string | null;
  record_id: string;
  score: number;
  breakdown: ScoreBreakdown;
}

export const GET = withErrorHandler(async function GET() {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  // Check cache first
  const inputHash = computeInputHash("relationship-scores", "v1");
  const cached = await getCachedContext(
    CACHE_USER_ID,
    CACHE_VIEW_TYPE,
    null,
    "default"
  );

  if (cached && isCacheFresh(cached)) {
    return NextResponse.json(cached.content);
  }

  // Fetch all contacts from Personize with properties
  const response = await client.memory.search({
    type: "Contact",
    collectionIds: [CONTACTS_COLLECTION_ID],
    returnRecords: true,
    pageSize: 500,
    page: 1,
  });

  const data = response.data as {
    records?: Array<{
      recordId?: string;
      record_id?: string;
      properties?: Record<string, string>;
    }>;
  } | null;

  const records = data?.records ?? [];

  const contacts: ScoredContact[] = records.map((record) => {
    const props = record.properties ?? {};
    const recordId =
      record.recordId ?? record.record_id ?? "unknown";
    const input = extractScoreInputs(props);
    const { score, breakdown } = computeRelationshipScore(input);

    return {
      email: props.email ?? null,
      name: props.full_name ?? props.name ?? "Unknown",
      company: props.company_name ?? props.company ?? null,
      record_id: recordId,
      score,
      breakdown,
    };
  });

  // Sort by score descending
  contacts.sort((a, b) => b.score - a.score);

  const result = { contacts };

  // Cache for 2 hours
  await setCachedContext(
    CACHE_USER_ID,
    CACHE_VIEW_TYPE,
    null,
    "default",
    inputHash,
    result as unknown as Record<string, unknown>,
    0,
    CACHE_TTL_MINUTES
  );

  return NextResponse.json(result);
});
