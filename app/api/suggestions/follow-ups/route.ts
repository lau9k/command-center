import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withErrorHandler } from "@/lib/api-error-handler";
import { searchContacts } from "@/lib/personize/actions";
import { checkBudget, recordUsage } from "@/lib/ai/budget";
import {
  getCachedContext,
  setCachedContext,
  isCacheFresh,
  computeInputHash,
} from "@/lib/ai/cache";

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";
const CACHE_VIEW_TYPE = "follow_up_suggestions";
const CACHE_TTL_MINUTES = 240; // 4 hours
const PROMPT_VERSION = "v1";
const FEATURE_NAME = "suggestions";
const ESTIMATED_AI_COST = 800;

export interface FollowUpSuggestion {
  name: string;
  email: string | null;
  company: string | null;
  score: number;
  reason: string;
  gmail_threads: number;
  days_since_last: number;
  action_url: string;
}

interface ScoredContact {
  name: string;
  email: string | null;
  company: string | null;
  gmail_threads: number;
  lautaro_sent: boolean;
  days_since_last: number;
  score: number;
}

function scoreContact(properties: Record<string, string>): ScoredContact | null {
  const gmailLatest = properties.gmail_latest;
  if (!gmailLatest) return null;

  const lastDate = new Date(gmailLatest);
  if (isNaN(lastDate.getTime())) return null;

  const daysSinceLast = Math.floor(
    (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only include contacts with 14+ day gap
  if (daysSinceLast < 14) return null;

  const gmailThreads = parseInt(properties.gmail_threads ?? "0", 10) || 0;
  const lautaroSent = properties.lautaro_sent === "true" || properties.lautaro_sent === "True";
  const stalenessBonus = Math.min(daysSinceLast, 30);

  const score = gmailThreads * 2 + (lautaroSent ? 10 : 0) + stalenessBonus;

  return {
    name: properties.full_name ?? properties.name ?? "Unknown",
    email: properties.email ?? null,
    company: properties.company_name ?? properties.company ?? null,
    gmail_threads: gmailThreads,
    lautaro_sent: lautaroSent,
    days_since_last: daysSinceLast,
    score,
  };
}

function deterministicReason(contact: ScoredContact): string {
  return `Last emailed ${contact.days_since_last} days ago across ${contact.gmail_threads} thread${contact.gmail_threads === 1 ? "" : "s"}`;
}

async function generateAIReasons(
  contacts: ScoredContact[]
): Promise<string[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const contactList = contacts
    .map(
      (c, i) =>
        `${i + 1}. ${c.name}${c.company ? ` (${c.company})` : ""} — ${c.gmail_threads} threads, last email ${c.days_since_last} days ago${c.lautaro_sent ? ", you initiated contact" : ""}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `For each contact below, write a concise one-line follow-up reason (max 15 words) explaining why the user should reconnect now. Be specific and actionable. Return one reason per line, numbered to match.

${contactList}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  // Map back; fall back to deterministic if AI output is short
  return contacts.map((c, i) => lines[i] || deterministicReason(c));
}

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  // Parse dismissed emails from query param
  const dismissedParam = request.nextUrl.searchParams.get("dismissed");
  const dismissed = new Set(
    dismissedParam ? dismissedParam.split(",").filter(Boolean) : []
  );

  // 1. Check cache
  const cached = await getCachedContext(
    DEFAULT_USER_ID,
    CACHE_VIEW_TYPE,
    null,
    "full"
  );

  if (cached && isCacheFresh(cached)) {
    const cachedSuggestions = (cached.content as { suggestions: FollowUpSuggestion[] }).suggestions;
    const filtered = cachedSuggestions.filter(
      (s) => !s.email || !dismissed.has(s.email)
    );
    return NextResponse.json({ data: { suggestions: filtered } });
  }

  // 2. Query Personize for contacts with gmail data
  // Fetch multiple pages to get a good pool of contacts
  const allContacts: Array<{ properties: Record<string, string> }> = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 7) {
    const result = await searchContacts(undefined, page, 50);
    for (const contact of result.contacts) {
      // We need contacts with gmail_context_stored === "true"
      // The mapRecordToContact strips properties, so we re-check via the raw data
      // Since searchContacts returns PersonizeContact, we check available fields
      // and use the original properties that were mapped
      allContacts.push({
        properties: {
          full_name: contact.name,
          email: contact.email ?? "",
          company_name: contact.company ?? "",
          company: contact.company ?? "",
          // These properties come from the Personize record but aren't in PersonizeContact
          // We'll score what we can; the search function already filters by collection
        },
      });
    }
    hasMore = result.hasMore;
    page++;
  }

  // For actual gmail properties, we need to use smartRecall to get contacts with gmail data
  // Let's use a targeted search for gmail contacts
  let scoredContacts: ScoredContact[] = [];

  try {
    const gmailRecallResult = await searchContacts(
      "gmail threads email correspondence",
      1,
      50
    );

    // Also do a broader recall for contacts with gmail data
    const { smartRecall } = await import("@/lib/personize/actions");
    const recallResult = await smartRecall(
      "contacts with gmail email threads correspondence follow up needed"
    );

    // Process recall results which include raw properties
    type RecallData = {
      records?: Array<{
        recordId?: string;
        properties?: Record<string, string>;
        text?: string;
      }>;
    };

    const rawRecords = (recallResult as RecallData)?.records;
    const memories = Array.isArray(rawRecords) ? rawRecords : [];
    const seenEmails = new Set<string>();

    for (const mem of memories) {
      const props = mem.properties;
      if (!props) continue;
      if (props.gmail_context_stored !== "true" && props.gmail_context_stored !== "True") continue;

      const email = props.email ?? "";
      if (email && seenEmails.has(email)) continue;
      if (email) seenEmails.add(email);

      const scored = scoreContact(props);
      if (scored) scoredContacts.push(scored);
    }

    // Also check the search results (these won't have gmail_ properties in PersonizeContact,
    // but the recall results should cover gmail-enriched contacts)
    // If recall gave us nothing, try getting contacts from the broader search
    if (scoredContacts.length === 0) {
      for (const contact of gmailRecallResult.contacts) {
        // Without raw properties, construct what we can
        const daysSince = contact.last_contact_date
          ? Math.floor(
              (Date.now() - new Date(contact.last_contact_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        if (daysSince !== null && daysSince >= 14) {
          scoredContacts.push({
            name: contact.name,
            email: contact.email,
            company: contact.company,
            gmail_threads: contact.message_count || 1,
            lautaro_sent: false,
            days_since_last: daysSince,
            score: (contact.message_count || 1) * 2 + Math.min(daysSince, 30),
          });
        }
      }
    }
  } catch (err) {
    console.error("[API] follow-ups: Personize query failed:", err);
    // Return empty suggestions if Personize unavailable
    return NextResponse.json({ data: { suggestions: [] } });
  }

  // 3. Sort by score and take top 5
  scoredContacts.sort((a, b) => b.score - a.score);
  const topContacts = scoredContacts.slice(0, 5);

  if (topContacts.length === 0) {
    return NextResponse.json({ data: { suggestions: [] } });
  }

  // 4. Generate reasons — check token budget first
  let reasons: string[];
  let tokenCost = 0;

  try {
    const budgetDecision = await checkBudget(
      DEFAULT_USER_ID,
      FEATURE_NAME,
      ESTIMATED_AI_COST
    );

    if (budgetDecision.allowed && process.env.ANTHROPIC_API_KEY) {
      reasons = await generateAIReasons(topContacts);
      tokenCost = ESTIMATED_AI_COST;
      await recordUsage(DEFAULT_USER_ID, FEATURE_NAME, tokenCost);
    } else {
      // Deterministic fallback
      reasons = topContacts.map(deterministicReason);
    }
  } catch {
    // Budget check or AI call failed — use deterministic
    reasons = topContacts.map(deterministicReason);
  }

  // 5. Build suggestions
  const suggestions: FollowUpSuggestion[] = topContacts.map((contact, i) => ({
    name: contact.name,
    email: contact.email,
    company: contact.company,
    score: contact.score,
    reason: reasons[i],
    gmail_threads: contact.gmail_threads,
    days_since_last: contact.days_since_last,
    action_url: `/contacts${contact.email ? `?search=${encodeURIComponent(contact.email)}` : ""}`,
  }));

  // 6. Cache result
  const inputHash = computeInputHash("follow-up-suggestions", PROMPT_VERSION);
  await setCachedContext(
    DEFAULT_USER_ID,
    CACHE_VIEW_TYPE,
    null,
    "full",
    inputHash,
    { suggestions } as unknown as Record<string, unknown>,
    tokenCost,
    CACHE_TTL_MINUTES
  );

  // 7. Filter dismissed and return
  const filtered = suggestions.filter(
    (s) => !s.email || !dismissed.has(s.email)
  );

  return NextResponse.json({ data: { suggestions: filtered } });
});
