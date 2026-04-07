"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import client from "./client";
import type { SyncStatsResult, SyncContactMemoryStatsResult } from "./types";

const COLLECTION_IDS: Record<string, string> = {
  contacts: process.env.PERSONIZE_CONTACTS_COLLECTION_ID!,
  companies: process.env.PERSONIZE_COMPANIES_COLLECTION_ID!,
  memory: process.env.PERSONIZE_MEMORY_COLLECTION_ID!,
};

const MEMORY_TYPE_MAP: Record<string, string> = {
  contacts: "contact",
  companies: "meeting",
  memory: "content",
};

function getServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function syncMemoryStats(
  projectId: string
): Promise<SyncStatsResult> {
  const supabase = getServiceRoleClient();
  const results: SyncStatsResult = { synced: 0, collections: [] };

  const entries = Object.entries(COLLECTION_IDS);

  const counts = await Promise.all(
    entries.map(async ([name, collectionId]) => {
      try {
        const response = await client.memory.search({
          collectionIds: [collectionId],
          countOnly: true,
        });
        const count = response.data?.totalMatched ?? 0;
        return { name, collectionId, count };
      } catch (error) {
        console.error(
          `[Personize] Failed to get count for collection ${name}:`,
          error
        );
        return { name, collectionId, count: 0 };
      }
    })
  );

  for (const { name, collectionId, count } of counts) {
    const memoryType = MEMORY_TYPE_MAP[name];

    const { error } = await supabase.from("memory_stats").upsert(
      {
        project_id: projectId,
        memory_type: memoryType,
        count,
        last_synced_at: new Date().toISOString(),
        metadata: { collectionId, collectionName: name },
      },
      { onConflict: "project_id,memory_type" }
    );

    if (error) {
      console.error(`[Personize] Failed to upsert memory_stats for ${name}:`, error);
      continue;
    }

    results.synced++;
    results.collections.push({
      collectionId,
      collectionName: name,
      count,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Per-contact memory stats sync
// ---------------------------------------------------------------------------

const PERSONIZE_API_BASE = "https://agent.personize.ai";
const PERSONIZE_API_KEY = process.env.PERSONIZE_SECRET_KEY ?? "";
const CONTACTS_COLLECTION_ID = process.env.PERSONIZE_CONTACTS_COLLECTION_ID!;

interface SearchPageData {
  recordIds?: string[];
  totalMatched?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  crmKeys?: Record<string, { type?: string; email?: string }>;
}

interface SearchRecordProps {
  [propName: string]: { value: string };
}

/**
 * Fetch all contact recordIds from Personize, check which have memories
 * via the memory_count property, and upsert accurate counts into memory_stats.
 */
export async function syncContactMemoryStats(
  projectId: string
): Promise<SyncContactMemoryStatsResult> {
  const supabase = getServiceRoleClient();

  // Step 1: Paginate through all contacts to get total count and all record IDs
  const allRecordIds: string[] = [];
  let page = 1;
  const pageSize = 50;
  let totalMatched = 0;

  for (;;) {
    const searchResponse = await client.memory.search({
      collectionIds: [CONTACTS_COLLECTION_ID],
      pageSize,
      page,
    });

    const searchData = (searchResponse?.data ?? searchResponse) as SearchPageData;
    const recordIds = Array.isArray(searchData?.recordIds) ? searchData.recordIds : [];

    if (page === 1) {
      totalMatched = searchData?.totalMatched ?? 0;
    }

    for (const rid of recordIds) {
      if (rid) allRecordIds.push(rid);
    }

    const totalPages = searchData?.totalPages ?? 1;
    if (page >= totalPages || recordIds.length === 0) break;
    page++;
  }

  // Step 2: Get contacts with memory_count property via /api/v1/search
  const contactsWithMemories = await fetchContactsWithMemories();

  // Step 3: Build upsert data — one row per contact that has memories
  const now = new Date().toISOString();
  let synced = 0;

  // Batch upsert contacts with memories
  if (contactsWithMemories.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < contactsWithMemories.length; i += BATCH_SIZE) {
      const batch = contactsWithMemories.slice(i, i + BATCH_SIZE).map((c) => ({
        project_id: projectId,
        memory_type: `contact:${c.recordId}`,
        count: c.memoryCount,
        record_count: c.memoryCount,
        last_synced_at: now,
        metadata: { record_id: c.recordId, contact_name: c.name },
      }));

      const { error } = await supabase
        .from("memory_stats")
        .upsert(batch, { onConflict: "project_id,memory_type" });

      if (error) {
        console.error("[syncContactMemoryStats] batch upsert failed:", error);
      } else {
        synced += batch.length;
      }
    }
  }

  // Step 4: Upsert a summary row for the "with memories" counter
  const withMemories = contactsWithMemories.filter((c) => c.memoryCount > 0).length;
  const { error: summaryError } = await supabase.from("memory_stats").upsert(
    {
      project_id: projectId,
      memory_type: "contacts_with_memories",
      count: withMemories,
      record_count: withMemories,
      last_synced_at: now,
      metadata: { total: totalMatched, synced },
    },
    { onConflict: "project_id,memory_type" }
  );

  if (summaryError) {
    console.error("[syncContactMemoryStats] summary upsert failed:", summaryError);
  }

  return {
    synced,
    withMemories,
    total: totalMatched,
  };
}

interface ContactMemoryInfo {
  recordId: string;
  name: string;
  memoryCount: number;
}

/**
 * Use Personize search to find contacts that have memory_count set.
 * This is a lightweight, no-LLM-cost endpoint.
 */
async function fetchContactsWithMemories(): Promise<ContactMemoryInfo[]> {
  const results: ContactMemoryInfo[] = [];
  let page = 1;
  const pageSize = 200;

  for (;;) {
    try {
      const response = await fetch(
        `${PERSONIZE_API_BASE}/api/v1/search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PERSONIZE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            collectionIds: [CONTACTS_COLLECTION_ID],
            groups: [
              {
                conditions: [
                  { propertyName: "memory_count", operator: "exists" },
                ],
              },
            ],
            returnRecords: true,
            pageSize,
            page,
          }),
        }
      );

      if (!response.ok) {
        console.error(
          `[syncContactMemoryStats] /api/v1/search failed: ${response.status}`
        );
        break;
      }

      const data = (await response.json()) as {
        data?: { records?: Record<string, SearchRecordProps> };
      };
      const records = data?.data?.records ?? {};
      const entries = Object.entries(records);

      for (const [recordId, props] of entries) {
        const countStr = props.memory_count?.value ?? "0";
        const memoryCount = parseInt(countStr, 10) || 0;
        results.push({
          recordId,
          name: props.full_name?.value ?? recordId,
          memoryCount,
        });
      }

      // If we got fewer than pageSize, we've exhausted results
      if (entries.length < pageSize) break;
      page += 1;
    } catch (error) {
      console.error("[syncContactMemoryStats] fetchContactsWithMemories failed:", error);
      break;
    }
  }

  return results;
}
