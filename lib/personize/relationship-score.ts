import type { PersonizeContact } from "./types";

// ---------------------------------------------------------------------------
// Scoring weight constants — tune these to adjust category contributions
// ---------------------------------------------------------------------------

/** Gmail depth: max 30 points */
export const WEIGHT_GMAIL = 30;
/** LinkedIn depth: max 25 points */
export const WEIGHT_LINKEDIN = 25;
/** Enrichment completeness: max 15 points (5 per signal) */
export const WEIGHT_ENRICHMENT = 15;
/** Recency: max 20 points */
export const WEIGHT_RECENCY = 20;
/** Memory depth: max 10 points */
export const WEIGHT_MEMORY = 10;

// ---------------------------------------------------------------------------
// Score breakdown returned alongside the composite score
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  gmail: number;
  linkedin: number;
  enrichment: number;
  recency: number;
  memory: number;
}

// ---------------------------------------------------------------------------
// Property shape expected from Personize record properties
// ---------------------------------------------------------------------------

export interface RelationshipScoreInput {
  gmail_threads?: number;
  lautaro_sent?: boolean;
  has_conversation?: boolean;
  message_count?: number;
  email?: string | null;
  linkedin_url?: string | null;
  apollo_enriched?: boolean;
  gmail_latest?: string | null;
  memory_count?: number;
}

/**
 * Extract scoring inputs from raw Personize record properties.
 * Property values come from Personize as strings, so we coerce here.
 */
export function extractScoreInputs(
  props: Record<string, string>
): RelationshipScoreInput {
  return {
    gmail_threads: parseInt(props.gmail_threads ?? "0", 10) || 0,
    lautaro_sent:
      props.lautaro_sent === "true" || props.lautaro_sent === "True",
    has_conversation:
      props.has_conversation === "true" || props.has_conversation === "True",
    message_count: parseInt(props.message_count ?? "0", 10) || 0,
    email: props.email ?? null,
    linkedin_url: props.linkedin_url ?? null,
    apollo_enriched:
      props.apollo_enriched === "true" || props.apollo_enriched === "True",
    gmail_latest: props.gmail_latest ?? null,
    memory_count: parseInt(props.memory_count ?? "0", 10) || 0,
  };
}

/**
 * Pure function: compute composite Relationship Strength Score (0-100)
 * from Personize contact properties.
 */
export function computeRelationshipScore(
  input: RelationshipScoreInput
): { score: number; breakdown: ScoreBreakdown } {
  // Gmail depth (0-30)
  const gmail = Math.min(
    WEIGHT_GMAIL,
    (input.gmail_threads ?? 0) * 2 + (input.lautaro_sent ? 5 : 0)
  );

  // LinkedIn depth (0-25)
  const linkedin = Math.min(
    WEIGHT_LINKEDIN,
    (input.has_conversation ? 10 : 0) +
      Math.min(15, (input.message_count ?? 0) * 1.5)
  );

  // Enrichment completeness (0-15): 5 pts each
  let enrichment = 0;
  if (input.email) enrichment += 5;
  if (input.linkedin_url) enrichment += 5;
  if (input.apollo_enriched) enrichment += 5;

  // Recency (0-20): based on gmail_latest
  let recency = 0;
  if (input.gmail_latest) {
    const daysSince = Math.floor(
      (Date.now() - new Date(input.gmail_latest).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSince <= 7) recency = 20;
    else if (daysSince <= 30) recency = 15;
    else if (daysSince <= 90) recency = 10;
    else if (daysSince <= 180) recency = 5;
  }

  // Memory depth (0-10)
  const memory = Math.min(WEIGHT_MEMORY, (input.memory_count ?? 0) * 2);

  const score = Math.max(
    0,
    Math.min(100, Math.round(gmail + linkedin + enrichment + recency + memory))
  );

  return {
    score,
    breakdown: {
      gmail: Math.round(gmail),
      linkedin: Math.round(linkedin),
      enrichment,
      recency,
      memory,
    },
  };
}

/**
 * Convenience wrapper: compute score directly from a PersonizeContact.
 */
export function computeScoreFromContact(
  contact: PersonizeContact,
  props?: Record<string, string>
): { score: number; breakdown: ScoreBreakdown } {
  const input: RelationshipScoreInput = {
    gmail_threads: props
      ? parseInt(props.gmail_threads ?? "0", 10) || 0
      : 0,
    lautaro_sent: props
      ? props.lautaro_sent === "true" || props.lautaro_sent === "True"
      : false,
    has_conversation: contact.has_conversation,
    message_count: contact.message_count,
    email: contact.email,
    linkedin_url: props?.linkedin_url ?? null,
    apollo_enriched: props
      ? props.apollo_enriched === "true" || props.apollo_enriched === "True"
      : false,
    gmail_latest: props?.gmail_latest ?? null,
    memory_count: props
      ? parseInt(props.memory_count ?? "0", 10) || 0
      : 0,
  };
  return computeRelationshipScore(input);
}
