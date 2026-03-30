"use server";

import Anthropic from "@anthropic-ai/sdk";
import client from "./client";
import type {
  SmartGuidelinesResponse,
  SmartDigestResponse,
  SmartRecallResult,
  GenerateWithContextResult,
  PersonizeContextResult,
  PersonizeContact,
  ContactSearchResult,
} from "./types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

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

export async function generateWithPersonizeContext(
  prompt: string,
  contactQuery?: string
): Promise<GenerateWithContextResult> {
  const { guidelines, memories } = await assembleContext(
    prompt,
    contactQuery
  );

  const systemParts = [
    guidelines
      ? `## Guidelines\n${guidelines.compiledContext}`
      : "",
    memories
      ? `## Relevant Memories\n${memories.compiledContext}`
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

    return { text, personizeContext: { guidelines, memories } };
  } catch (error) {
    console.error("[Personize] generateWithPersonizeContext failed:", error);
    return { text: "", personizeContext: { guidelines, memories } };
  }
}

export async function memorize(
  content: string,
  tags: string[]
): Promise<boolean> {
  try {
    await client.memory.memorize({
      content,
      tags,
      enhanced: true,
    });
    return true;
  } catch (error) {
    console.error("[Personize] memorize failed:", error);
    return false;
  }
}

export async function smartRecall(
  query: string,
  options?: { email?: string; collectionIds?: string[] }
): Promise<SmartRecallResult | null> {
  try {
    const response = await client.memory.smartRecall({
      query,
      fast_mode: true,
      min_score: 0.3,
      ...options,
    });
    return response.data as SmartRecallResult | null;
  } catch (error) {
    console.error("[Personize] smartRecall failed:", error);
    return null;
  }
}

export async function smartDigest(
  query: string,
  options?: { email?: string; record_id?: string; token_budget?: number }
): Promise<SmartDigestResponse | null> {
  try {
    const { token_budget = 2000, ...rest } = options ?? {};
    const response = await client.memory.smartDigest({
      token_budget,
      include_properties: true,
      ...rest,
    });
    return response.data ?? null;
  } catch (error) {
    console.error("[Personize] smartDigest failed:", error);
    return null;
  }
}

export async function assembleContext(
  taskDescription: string,
  contactQuery?: string
): Promise<PersonizeContextResult> {
  const [guidelines, memories, recall] = await Promise.all([
    getSmartGuidelines(taskDescription),
    contactQuery
      ? smartDigest(taskDescription, { email: contactQuery })
      : Promise.resolve(null),
    smartRecall(taskDescription, contactQuery ? { email: contactQuery } : undefined),
  ]);

  return { guidelines, memories, recall };
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

/** Map raw Personize record properties to our PersonizeContact shape. */
function mapRecordToContact(
  record: { recordId?: string; record_id?: string; properties?: Record<string, string> },
  index: number
): PersonizeContact {
  const props = record.properties ?? {};
  const recordId = record.recordId ?? record.record_id ?? `unknown-${index}`;
  const priorityScore = parseFloat(props.priority_score ?? "0") || 0;

  return {
    id: recordId,
    record_id: recordId,
    name: props.full_name ?? props.name ?? "Unknown",
    email: props.email ?? null,
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
 * Uses `memory.search()` with pagination.
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
    // If there's a text query, use smartRecall for semantic search
    if (query) {
      const recallResponse = await client.memory.smartRecall({
        collectionIds: [CONTACTS_COLLECTION_ID],
        query,
        min_score: 0.3,
        fast_mode: true,
      });

      const recallData = recallResponse.data as {
        memories?: Array<{
          record_id?: string;
          recordId?: string;
          properties?: Record<string, string>;
        }>;
      } | null;

      const memories = recallData?.memories ?? [];
      const seen = new Set<string>();
      const queryContacts: PersonizeContact[] = [];

      for (const mem of memories) {
        const rid = mem.record_id ?? mem.recordId;
        if (!rid || seen.has(rid)) continue;
        seen.add(rid);
        if (mem.properties) {
          queryContacts.push(mapRecordToContact({ recordId: rid, properties: mem.properties }, queryContacts.length));
        }
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
      records?: Array<{ recordId?: string; record_id?: string; properties?: Record<string, string> }>;
      total?: number;
    } | null;

    const records = data?.records ?? [];
    const contacts = records.map((r, i) => mapRecordToContact(r, i));

    // Sort by priority_score descending by default
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
 * Get a single contact's full detail with AI-compiled summary via smartDigest.
 */
export async function getContactById(
  recordId: string
): Promise<{ contact: PersonizeContact; summary: string } | null> {
  const cacheKey = `contact-detail:${recordId}`;
  const cached = getCached<{ contact: PersonizeContact; summary: string }>(cacheKey);
  if (cached) return cached;

  try {
    const response = await client.memory.smartDigest({
      record_id: recordId,
      token_budget: 2000,
      include_properties: true,
    });

    const data = response.data as {
      recordId?: string;
      record_id?: string;
      properties?: Record<string, string>;
      compiledContext?: string;
    } | null;

    if (!data) return null;

    const contact = mapRecordToContact(
      { recordId: data.recordId ?? data.record_id ?? recordId, properties: data.properties },
      0
    );
    const summary = data.compiledContext ?? "";

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
 * Uses memory.search per record in parallel (bounded concurrency).
 */
export async function batchGetMemoryCounts(
  recordIds: string[]
): Promise<Map<string, number>> {
  const cacheKey = `memory-counts:${recordIds.sort().join(",")}`;
  const cached = getCached<Map<string, number>>(cacheKey);
  if (cached) return cached;

  const counts = new Map<string, number>();

  // Batch in groups of 10 for bounded concurrency
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
 * Semantic search across contacts using smartRecall.
 * Returns ranked contacts by relevance.
 */
export async function recallContacts(
  query: string
): Promise<PersonizeContact[]> {
  const cacheKey = `contact-recall:${query}`;
  const cached = getCached<PersonizeContact[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await client.memory.smartRecall({
      collectionIds: [CONTACTS_COLLECTION_ID],
      query,
      min_score: 0.3,
      fast_mode: true,
    });

    const data = response.data as {
      memories?: Array<{
        record_id?: string;
        recordId?: string;
        properties?: Record<string, string>;
        score?: number;
        text?: string;
      }>;
    } | null;

    const memories = data?.memories ?? [];

    // Group by record_id and take unique contacts
    const seen = new Set<string>();
    const contacts: PersonizeContact[] = [];

    for (const mem of memories) {
      const rid = mem.record_id ?? mem.recordId;
      if (!rid || seen.has(rid)) continue;
      seen.add(rid);

      if (mem.properties) {
        contacts.push(mapRecordToContact({ recordId: rid, properties: mem.properties }, contacts.length));
      } else {
        // Create a minimal contact from the memory text
        contacts.push({
          id: rid,
          record_id: rid,
          name: mem.text?.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 100) ?? "Unknown",
          email: null,
          phone: null,
          company: null,
          role: null,
          job_title: null,
          has_conversation: false,
          message_count: 0,
          priority_score: (mem.score ?? 0) * 100,
          last_interaction_date: null,
          memory_count: null,
          source: "linkedin",
          status: "active",
          tags: [],
          score: Math.round((mem.score ?? 0) * 100),
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
