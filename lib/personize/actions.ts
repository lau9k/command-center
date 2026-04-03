"use server";

import Anthropic from "@anthropic-ai/sdk";
import client from "./client";
import type {
  SmartGuidelinesResponse,
  SmartRecallResult,
  GenerateWithContextResult,
  PersonizeContextResult,
  PersonizeContact,
  ContactSearchResult,
} from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ---------------------------------------------------------------------------
// Local types for unified SmartRecall API response
// ---------------------------------------------------------------------------

interface SmartRecallRecord {
  recordId: string;
  displayName?: string;
  email?: string;
  properties?: Record<string, string>;
  score?: number;
  text?: string;
  label?: string;
  summary?: Record<string, unknown>;
  context?: string;
  relevanceTier?: "direct" | "partial" | "might";
}

interface UnifiedSmartRecallResponse {
  success: boolean;
  answer?: string;
  records: SmartRecallRecord[];
  plan?: {
    classifiedAs: string[];
    steps: string[];
    mode: "fast" | "deep";
    confidence: number;
  };
  meta?: {
    totalMatched: number;
    returned: number;
    enrichmentDepth: string;
    tokensUsed: number;
  };
  /** @deprecated Mapped from answer for backward compatibility with smartDigest callers. */
  compiledContext?: string;
  properties?: Record<string, string>;
}

/**
 * Options for the unified smartRecall endpoint (/api/v1/smart-recall-unified).
 * Uses the SDK's client.smartRecallUnified() method directly.
 */
interface UnifiedSmartRecallOptions {
  message: string;
  identifiers?: {
    emails?: string[];
    websites?: string[];
    recordIds?: string[];
    type?: string;
  };
  responseDetail?: "ids" | "labels" | "summary" | "context" | "full";
  tokenBudget?: number;
  mode?: "fast" | "deep" | "auto";
}

/**
 * Call the unified smartRecall API via client.smartRecallUnified().
 * This hits /api/v1/smart-recall-unified which supports identifiers and
 * responseDetail natively, unlike the old /api/v1/smart-recall endpoint.
 */
async function callUnifiedSmartRecall(
  options: UnifiedSmartRecallOptions
): Promise<UnifiedSmartRecallResponse | null> {
  try {
    // The SDK's smartRecallUnified returns the raw HTTP body as-is.
    // Unlike other SDK methods (memory.smartRecall, memory.recall, etc.)
    // which unwrap the { success, data: {...} } envelope, smartRecallUnified
    // does NOT unwrap — so we must do it ourselves.
    const rawResponse = await (client as unknown as {
      smartRecallUnified: (data: UnifiedSmartRecallOptions) => Promise<Record<string, unknown>>;
    }).smartRecallUnified(options);

    if (!rawResponse) return null;

    // Unwrap API envelope: if response has .data with .records, use .data
    // Otherwise use the response directly (in case SDK is fixed in a future version)
    const unwrapped = (
      rawResponse.data &&
      typeof rawResponse.data === "object" &&
      "records" in (rawResponse.data as Record<string, unknown>)
    )
      ? (rawResponse.data as UnifiedSmartRecallResponse)
      : (rawResponse as unknown as UnifiedSmartRecallResponse);

    if (!Array.isArray(unwrapped.records)) {
      unwrapped.records = [];
    }
    return unwrapped;
  } catch (error) {
    console.error("[Personize] callUnifiedSmartRecall failed:", error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

export async function getSmartGuidelines(
  query: string
): Promise<SmartGuidelinesResponse | null> {
  try {
    const response = await client.ai.smartGuidelines({ message: query });
    return response.data ?? null;
  } catch (error) {
    console.error("[Personize] smartGuidelines failed:", error);
    return null;
  }
}

export async function smartRecall(
  query: string,
  options?: {
    email?: string;
    collectionIds?: string[];
    session_id?: string;
    responseDetail?: "ids" | "labels" | "summary" | "context" | "full";
  }
): Promise<SmartRecallResult | null> {
  try {
    const { email, responseDetail } = options ?? {};

    const identifiers: UnifiedSmartRecallOptions["identifiers"] = {};
    if (email) {
      identifiers.emails = [email];
    }

    const data = await callUnifiedSmartRecall({
      message: query,
      ...(Object.keys(identifiers).length > 0 ? { identifiers } : {}),
      ...(responseDetail ? { responseDetail } : {}),
    });
    return data as SmartRecallResult | null;
  } catch (error) {
    console.error("[Personize] smartRecall failed:", error);
    return null;
  }
}

/**
 * Get a full digest for a contact using unified smartRecall with response_detail:"full".
 * Replaces the legacy smartDigest function.
 */
export async function getContactDigest(
  query: string,
  options?: { email?: string; record_id?: string }
): Promise<UnifiedSmartRecallResponse | null> {
  try {
    const identifiers: UnifiedSmartRecallOptions["identifiers"] = {};
    if (options?.email) {
      identifiers.emails = [options.email];
    }
    if (options?.record_id) {
      identifiers.recordIds = [options.record_id];
    }

    return callUnifiedSmartRecall({
      message: query,
      ...(Object.keys(identifiers).length > 0 ? { identifiers } : {}),
      responseDetail: "full",
    });
  } catch (error) {
    console.error("[Personize] getContactDigest failed:", error);
    return null;
  }
}

/**
 * @deprecated Use getContactDigest instead. Kept for backward compatibility.
 */
export async function smartDigest(
  query: string,
  options?: { email?: string; record_id?: string; token_budget?: number }
): Promise<UnifiedSmartRecallResponse | null> {
  const { token_budget: _token_budget, ...rest } = options ?? {};
  const result = await getContactDigest(query, rest);
  if (!result) return null;
  return {
    ...result,
    compiledContext: result.answer,
    properties: result.records?.[0]?.properties,
  };
}

export async function assembleContext(
  taskDescription: string,
  contactQuery?: string
): Promise<PersonizeContextResult> {
  const [guidelines, recall] = await Promise.all([
    getSmartGuidelines(taskDescription),
    smartRecall(taskDescription, contactQuery ? { email: contactQuery } : undefined),
  ]);

  return { guidelines, memories: null, recall };
}

export async function generateWithPersonizeContext(
  prompt: string,
  contactQuery?: string
): Promise<GenerateWithContextResult> {
  const { guidelines, recall } = await assembleContext(prompt, contactQuery);

  const recallData = recall as unknown as UnifiedSmartRecallResponse | null;

  const systemParts = [
    guidelines
      ? `## Guidelines\n${guidelines.compiledContext}`
      : "",
    recallData?.answer
      ? `## Relevant Context\n${recallData.answer}`
      : "",
  ].filter(Boolean);

  const systemPrompt = systemParts.join("\n\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return { text, personizeContext: { guidelines, memories: null } };
  } catch (error) {
    console.error("[Personize] generateWithPersonizeContext failed:", error);
    return { text: "", personizeContext: { guidelines, memories: null } };
  }
}

export async function memorize(
  content: string,
  tags: string[],
  email?: string
): Promise<boolean> {
  try {
    await client.memory.memorize({
      content,
      tags,
      enhanced: true,
      ...(email ? { email } : {}),
    });
    return true;
  } catch (error) {
    console.error("[Personize] memorize failed:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Contact-specific helpers (Personize Contact collection)
// ---------------------------------------------------------------------------

const CONTACTS_COLLECTION_ID =
  process.env.PERSONIZE_CONTACTS_COLLECTION_ID ??
  "5686312a-7ab7-4cef-897c-576bfeb92aec";

const PERSONIZE_API_BASE = "https://agent.personize.ai";
const PERSONIZE_API_KEY = process.env.PERSONIZE_SECRET_KEY ?? "";

// ---------------------------------------------------------------------------
// Property enrichment — fetch full_name, job_title, company_name for contacts
// ---------------------------------------------------------------------------

interface PropertyLookupEntry {
  full_name?: string;
  job_title?: string;
  company_name?: string;
}

/**
 * Fetch all contacts that have a given property set, via the deterministic
 * /api/v1/memory/filter-by-property endpoint (no LLM, no token cost).
 * Returns a Map of recordId → property value.
 */
async function fetchPropertyValues(
  propertyName: string,
  limit = 200
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  try {
    const response = await fetch(`${PERSONIZE_API_BASE}/api/v1/memory/filter-by-property`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERSONIZE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collectionId: CONTACTS_COLLECTION_ID,
        conditions: [{ propertyName, operator: "exists" }],
        limit,
      }),
    });
    if (!response.ok) return result;
    const data = await response.json();
    const records = data?.data?.records ?? [];
    for (const rec of records) {
      if (rec.recordId && rec.matchedProperties?.[propertyName]) {
        result.set(rec.recordId, rec.matchedProperties[propertyName]);
      }
    }
  } catch (error) {
    console.error(`[Personize] fetchPropertyValues(${propertyName}) failed:`, error);
  }
  return result;
}

/**
 * Build a lookup table of recordId → {full_name, job_title, company_name}.
 * Makes 3 parallel API calls to filter-by-property (deterministic, no LLM cost).
 * Cached for 5 minutes.
 */
async function getPropertyLookup(): Promise<Map<string, PropertyLookupEntry>> {
  const cacheKey = "property-lookup";
  const cached = getCached<Map<string, PropertyLookupEntry>>(cacheKey);
  if (cached) return cached;

  const [names, titles, companies] = await Promise.all([
    fetchPropertyValues("full_name", 200),
    fetchPropertyValues("job_title", 200),
    fetchPropertyValues("company_name", 200),
  ]);

  const lookup = new Map<string, PropertyLookupEntry>();
  // Merge all three maps into a single lookup
  const allIds = new Set([...names.keys(), ...titles.keys(), ...companies.keys()]);
  for (const id of allIds) {
    lookup.set(id, {
      full_name: names.get(id),
      job_title: titles.get(id),
      company_name: companies.get(id),
    });
  }

  setCache(cacheKey, lookup);
  return lookup;
}

/** Simple in-memory cache with TTL. */
const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Extract the local part of an email, replace separators with spaces, and title-case each word. */
function cleanEmailName(email: string): string {
  const local = email.split("@")[0];
  return local
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Map a SmartRecall record to our PersonizeContact shape. */
function mapRecordToContact(
  record: {
    recordId?: string;
    record_id?: string;
    displayName?: string;
    email?: string;
    properties?: Record<string, string>;
  },
  index: number
): PersonizeContact {
  const props = record.properties ?? {};
  const recordId = record.recordId ?? record.record_id ?? `unknown-${index}`;
  const priorityScore = parseFloat(props.priority_score ?? "0") || 0;

  return {
    id: recordId,
    record_id: recordId,
    name: record.displayName ?? props.full_name ?? props.name ?? ((record.email ?? props.email) ? cleanEmailName((record.email ?? props.email)!) : "Unknown Contact"),
    email: record.email ?? props.email ?? null,
    phone: props.phone ?? null,
    company: props.company_name ?? props.company ?? null,
    role: props.job_title ?? props.title ?? null,
    job_title: props.job_title ?? props.title ?? null,
    has_conversation: props.has_conversation === "true" || props.has_conversation === "True",
    message_count: parseInt(props.message_count ?? "0", 10) || 0,
    priority_score: priorityScore,
    last_interaction_date: props.last_interaction_date ?? null,
    memory_count: parseInt(props.memory_count ?? "0", 10) || 0,
    source: "linkedin",
    status: "active",
    tags: props.tags ? props.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    score: Math.round(priorityScore),
    notes: null,
    project_id: "00000000-0000-0000-0000-000000000000",
    last_contact_date: props.last_interaction_date ?? null,
    merged_into_id: null,
    created_at: props.created_at ?? new Date().toISOString(),
    updated_at: props.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Map a crmKey entry (from /api/v1/search) to a PersonizeContact.
 * crmKeys provide recordId, email, and type — but not names or properties.
 * Names are extracted from email prefix as a fallback.
 */
function mapCrmKeyToContact(
  recordId: string,
  crmKey: { type?: string; email?: string },
  index: number
): PersonizeContact {
  const email = crmKey.email ?? null;
  // Derive a display name from the email prefix (e.g. "john.doe@acme.com" → "John Doe")
  let name = "Unknown";
  if (email && !email.includes("unknown@") && !email.includes("placeholder.personize")) {
    const prefix = email.split("@")[0];
    name = prefix
      .replace(/[._-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  }

  return {
    id: recordId,
    record_id: recordId,
    name,
    email,
    phone: null,
    company: email ? email.split("@")[1] ?? null : null,
    role: null,
    job_title: null,
    has_conversation: false,
    message_count: 0,
    priority_score: 0,
    last_interaction_date: null,
    memory_count: null,
    source: "linkedin",
    status: "active",
    tags: [],
    score: 0,
    notes: null,
    project_id: "00000000-0000-0000-0000-000000000000",
    last_contact_date: null,
    merged_into_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Search contacts from the Personize Contact collection.
 *
 * Listing (no query): Uses /api/v1/search with collectionIds to get the full
 * paginated contact list (2,000+ records). This is the only reliable way to
 * browse contacts — smartRecallUnified's identifiers.type filter doesn't match
 * records stored via collection-based memorization.
 *
 * Search (with query): Uses smartRecallUnified for semantic search without
 * a type filter (the type filter returns 0 results for collection-stored records).
 */
export async function searchContacts(
  query?: string,
  page = 1,
  pageSize = 50,
  sort?: string
): Promise<ContactSearchResult> {
  const cacheKey = `contacts:${query ?? ""}:${page}:${pageSize}:${sort ?? ""}`;
  const cached = getCached<ContactSearchResult>(cacheKey);
  if (cached) return cached;

  try {
    if (query) {
      // Semantic search — use smartRecallUnified WITHOUT type filter
      // (identifiers.type:"Contact" returns 0 results for collection-stored records)
      const data = await callUnifiedSmartRecall({
        message: query,
        responseDetail: "summary",
      });
      const records = data?.records ?? [];
      const seen = new Set<string>();
      const queryContacts: PersonizeContact[] = [];

      for (const rec of records) {
        const rid = rec.recordId;
        if (!rid || seen.has(rid)) continue;
        seen.add(rid);
        queryContacts.push(mapRecordToContact(rec, queryContacts.length));
      }

      const queryResult: ContactSearchResult = {
        contacts: queryContacts,
        total: queryContacts.length,
        page: 1,
        pageSize: queryContacts.length,
        hasMore: false,
      };
      setCache(cacheKey, queryResult);
      return queryResult;
    }

    // No query — list contacts via /api/v1/search with collectionIds.
    // This returns recordIds + crmKeys (email, type) with proper pagination.
    // smartRecallUnified can't list contacts because identifiers.type:"Contact"
    // doesn't match records stored via collection-based memorization.
    const searchResponse = await client.memory.search({
      collectionIds: [CONTACTS_COLLECTION_ID],
      pageSize,
      page,
    });

    // SDK unwraps the { success, data: {...} } envelope for memory.search
    const searchData = (searchResponse?.data ?? searchResponse) as {
      recordIds?: string[];
      totalMatched?: number;
      page?: number;
      pageSize?: number;
      totalPages?: number;
      crmKeys?: Record<string, { type?: string; email?: string }>;
    };

    const recordIds = Array.isArray(searchData?.recordIds) ? searchData.recordIds : [];
    const crmKeys = searchData?.crmKeys ?? {};
    const totalMatched = searchData?.totalMatched ?? recordIds.length;

    // Fetch property lookup (full_name, job_title, company_name) — cached, no LLM cost
    const propertyLookup = await getPropertyLookup();

    const contacts: PersonizeContact[] = [];
    for (const rid of recordIds) {
      if (!rid) continue;
      const crm = crmKeys[rid] ?? {};
      // Skip non-contact records (e.g. type:"user" for the org owner)
      if (crm.type && crm.type !== "contact") continue;
      const contact = mapCrmKeyToContact(rid, crm, contacts.length);

      // Enrich with actual properties if available
      const props = propertyLookup.get(rid);
      if (props) {
        if (props.full_name) contact.name = props.full_name;
        if (props.job_title) {
          contact.job_title = props.job_title;
          contact.role = props.job_title;
        }
        if (props.company_name) contact.company = props.company_name;
      }

      contacts.push(contact);
    }

    if (sort === "name") {
      contacts.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "last_interaction_date") {
      contacts.sort((a, b) => {
        const dateA = a.last_interaction_date ? new Date(a.last_interaction_date).getTime() : 0;
        const dateB = b.last_interaction_date ? new Date(b.last_interaction_date).getTime() : 0;
        return dateB - dateA;
      });
    }

    const result: ContactSearchResult = {
      contacts,
      total: totalMatched,
      page: searchData?.page ?? page,
      pageSize: contacts.length,
      hasMore: (searchData?.page ?? page) < (searchData?.totalPages ?? 1),
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Personize] searchContacts failed:", error);
    throw error;
  }
}

/**
 * Get a single contact's full detail using smartRecall with recordIds + response_detail:"full".
 */
export async function getContactById(
  recordId: string
): Promise<{ contact: PersonizeContact; summary: string } | null> {
  const cacheKey = `contact-detail:${recordId}`;
  const cached = getCached<{ contact: PersonizeContact; summary: string }>(cacheKey);
  if (cached) return cached;

  try {
    const data = await callUnifiedSmartRecall({
      message: `full details for contact ${recordId}`,
      identifiers: { recordIds: [recordId] },
      responseDetail: "full",
    });
    if (!data) return null;

    const rec = data.records?.[0];
    if (!rec) return null;

    const contact = mapRecordToContact(
      { recordId: rec.recordId ?? recordId, displayName: rec.displayName, email: rec.email, properties: rec.properties },
      0
    );
    const summary = data.answer ?? "";

    const result = { contact, summary };
    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("[Personize] getContactById failed:", error);
    throw error;
  }
}

/**
 * Batch-fetch memory counts for a list of contacts.
 * Returns a Map of record_id → memory count.
 */
export async function batchGetMemoryCounts(
  recordIds: string[]
): Promise<Map<string, number>> {
  const cacheKey = `memory-counts:${recordIds.sort().join(",")}`;
  const cached = getCached<Map<string, number>>(cacheKey);
  if (cached) return cached;

  const counts = new Map<string, number>();

  const BATCH_SIZE = 10;
  for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
    const batch = recordIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (recordId) => {
        try {
          const response = await client.memory.search({
            recordId,
            collectionIds: [CONTACTS_COLLECTION_ID],
            returnRecords: false,
            pageSize: 1,
          });
          const data = response.data as { totalMatched?: number } | null;
          return { recordId, count: data?.totalMatched ?? 0 };
        } catch {
          return { recordId, count: 0 };
        }
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        counts.set(result.value.recordId, result.value.count);
      }
    }
  }

  setCache(cacheKey, counts);
  return counts;
}

/**
 * Semantic search across contacts using unified smartRecall + response_detail:"summary".
 * Note: identifiers.type:"Contact" is NOT used because it returns 0 results for
 * records stored via collection-based memorization in Personize.
 */
export async function recallContacts(
  query: string
): Promise<PersonizeContact[]> {
  const cacheKey = `contact-recall:${query}`;
  const cached = getCached<PersonizeContact[]>(cacheKey);
  if (cached) return cached;

  try {
    const data = await callUnifiedSmartRecall({
      message: query,
      responseDetail: "summary",
    });
    const records = data?.records ?? [];

    const seen = new Set<string>();
    const contacts: PersonizeContact[] = [];

    for (const rec of records) {
      const rid = rec.recordId;
      if (!rid || seen.has(rid)) continue;
      seen.add(rid);

      if (rec.properties || rec.displayName) {
        contacts.push(mapRecordToContact(rec, contacts.length));
      } else {
        contacts.push({
          id: rid,
          record_id: rid,
          name: rec.text?.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 100) ?? "Unknown",
          email: rec.email ?? null,
          phone: null,
          company: null,
          role: null,
          job_title: null,
          has_conversation: false,
          message_count: 0,
          priority_score: (rec.score ?? 0) * 100,
          last_interaction_date: null,
          memory_count: null,
          source: "linkedin",
          status: "active",
          tags: [],
          score: Math.round((rec.score ?? 0) * 100),
          notes: null,
          project_id: "00000000-0000-0000-0000-000000000000",
          last_contact_date: null,
          merged_into_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    setCache(cacheKey, contacts);
    return contacts;
  } catch (error) {
    console.error("[Personize] recallContacts failed:", error);
    throw error;
  }
}
