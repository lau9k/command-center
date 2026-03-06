"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import client from "./client";
import type { SyncStatsResult } from "./types";

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
