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
  "5686312a-7ab7-4cef-897c-576bfeb92aec";

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

function parseRecordIds(param: string | null): string[] | null {
  if (!param) return null;

  // Try JSON array first, then comma-separated
  try {
    const parsed: unknown = JSON.parse(param);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed.length > 0 ? parsed : null;
    }
  } catch {
    // Not JSON — treat as comma-separated
  }

  const ids = param
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : null;
}

export const GET = withErrorHandler(async function GET(request: Request) {
  if (!process.env.PERSONIZE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Personize not configured" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const recordIds = parseRecordIds(searchParams.get("recordIds"));

  // When scoped to specific records, skip the full-result cache
  if (!recordIds) {
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
  }

  type PersonizeRecord = {
    recordId?: string;
    record_id?: string;
    properties?: Record<string, string>;
  };

  let records: PersonizeRecord[];

  // Fetch contacts — use a smaller page when scoped to specific IDs
  const pageSize = recordIds ? Math.max(recordIds.length, 50) : 100;
  const response = await client.memory.search({
    type: "Contact",
    collectionIds: [CONTACTS_COLLECTION_ID],
    returnRecords: true,
    pageSize,
    page: 1,
  });

  const data = response.data as { records?: PersonizeRecord[] } | null;
  const allRecords = Array.isArray(data?.records) ? data.records : [];

  if (recordIds) {
    const idSet = new Set(recordIds);
    records = allRecords.filter((r) => {
      const id = r.recordId ?? r.record_id;
      return id !== undefined && idSet.has(id);
    });
  } else {
    records = allRecords;
  }

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

  // Cache full results for 2 hours (skip cache for scoped requests)
  if (!recordIds) {
    const inputHash = computeInputHash("relationship-scores", "v1");
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
  }

  return NextResponse.json(result);
});
