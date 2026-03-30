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
}

interface UnifiedSmartRecallResponse {
  success: boolean;
  answer?: string;
  records?: SmartRecallRecord[];
  memories?: SmartRecallResult["memories"];
  /** @deprecated Mapped from answer for backward compatibility with smartDigest callers. */
  compiledContext?: string;
  properties?: Record<string, string>;
}

interface SmartRecallIdentifier {
  type?: string;
  recordIds?: string[];
  email?: string;
  collectionIds?: string[];
}

/** Unified SmartRecall options (extends SDK's SmartRecallOptions with new fields). */
interface UnifiedSmartRecallOptions {
  message: string;
  identifiers?: SmartRecallIdentifier[];
  session_id?: string;
  response_detail?: "full" | "summary";
}

/**
 * Call the unified smartRecall API. The SDK types haven't been updated yet,
 * so we cast through Record to pass the new fields.
 */
async function callUnifiedSmartRecall(
  options: UnifiedSmartRecallOptions
): Promise<UnifiedSmartRecallResponse | null> {
  const response = await client.memory.smartRecall(
    options as unknown as Parameters<typeof client.memory.smartRecall>[0]
  );
  return response.data as unknown as UnifiedSmartRecallResponse | null;
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
    identifiers?: SmartRecallIdentifier[];
    session_id?: string;
    response_detail?: "full" | "summary";
  }
): Promise<SmartRecallResult | null> {
  try {
    const { email, collectionIds, identifiers, session_id, response_detail } = options ?? {};

    const builtIdentifiers: SmartRecallIdentifier[] = identifiers ?? [];
    if (email && !identifiers) {
      builtIdentifiers.push({ email });
    }
    if (collectionIds && !identifiers) {
      builtIdentifiers.push({ collectionIds });
    }

    const data = await callUnifiedSmartRecall({
      message: query,
      ...(builtIdentifiers.length > 0 ? { identifiers: builtIdentifiers } : {}),
      ...(session_id ? { session_id } : {}),
      ...(response_detail ? { response_detail } : {}),
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
    const identifiers: SmartRecallIdentifier[] = [];
    if (options?.email) {
      identifiers.push({ email: options.email });
    }
    if (options?.record_id) {
      identifiers.push({ recordIds: [options.record_id] });
    }

    return callUnifiedSmartRecall({
      message: query,
      ...(identifiers.length > 0 ? { identifiers } : {}),
      response_detail: "full",
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
  "8ef5a304-05b0-4f06-9660-fb948b9fa5d9";

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
    name: record.displayName ?? props.full_name ?? props.name ?? "Unknown",
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
 * Search contacts from the Personize Contact collection.
 * Uses unified smartRecall with type:"contact" identifier for semantic search.
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
      const data = await callUnifiedSmartRecall({
        message: query,
        identifiers: [{ type: "contact", collectionIds: [CONTACTS_COLLECTION_ID] }],
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

    // No query — list all contacts with pagination
    const response = await client.memory.search({
      type: "Contact",
      collectionIds: [CONTACTS_COLLECTION_ID],
      returnRecords: true,
      pageSize,
      page,
    });
    const data = response.data as {
      records?: Array<{ recordId?: string; record_id?: string; displayName?: string; email?: string; properties?: Record<string, string> }>;
      total?: number;
    } | null;

    const records = data?.records ?? [];
    const contacts = records.map((r, i) => mapRecordToContact(r, i));

    if (sort === "priority_score" || !sort) {
      contacts.sort((a, b) => b.priority_score - a.priority_score);
    } else if (sort === "name") {
      contacts.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "last_interaction_date") {
      contacts.sort((a, b) => {
        const dateA = a.last_interaction_date ? new Date(a.last_interaction_date).getTime() : 0;
        const dateB = b.last_interaction_date ? new Date(b.last_interaction_date).getTime() : 0;
        return dateB - dateA;
      });
    }

    const total = data?.total ?? contacts.length;
    const result: ContactSearchResult = {
      contacts,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
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
      message: recordId,
      identifiers: [{ recordIds: [recordId] }],
      response_detail: "full",
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
 * Semantic search across contacts using unified smartRecall with type:"contact" + response_detail:"summary".
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
      identifiers: [{ type: "contact", collectionIds: [CONTACTS_COLLECTION_ID] }],
      response_detail: "summary",
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
