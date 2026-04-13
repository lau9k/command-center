/**
 * Personize Schema Audit
 *
 * Dumps every collection's entityType, last-write timestamp, and record count.
 * Also checks entity-type casing consistency and flags stale collections.
 *
 * Usage: npx tsx scripts/personize-schema-audit.ts
 *
 * Options:
 *   --fix-casing    Update entityType to lowercase for collections that use capital case
 *   --json          Output as JSON instead of table
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Load .env.local before any SDK imports
// ---------------------------------------------------------------------------
(function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(f), "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    } catch {
      // file not found — skip
    }
  }
})();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = "https://agent.personize.ai";
const API_KEY = process.env.PERSONIZE_SECRET_KEY ?? process.env.PERSONIZE_API_KEY ?? "";

const KNOWN_COLLECTIONS: Record<string, string> = {
  "Contacts (Standard Profile)": process.env.PERSONIZE_CONTACTS_COLLECTION_ID ?? "5686312a-7ab7-4cef-897c-576bfeb92aec",
  "Companies (Company Properties)": process.env.PERSONIZE_COMPANIES_COLLECTION_ID ?? "855353ac-4919-4b8e-89f5-f985f45d6ca1",
  "Memory (Agent Memory)": process.env.PERSONIZE_MEMORY_COLLECTION_ID ?? "6033bc36-7722-4b56-b71b-b62d1d46c74c",
};

const STALE_THRESHOLD_DAYS = 14;
const ARGS = process.argv.slice(2);
const FIX_CASING = ARGS.includes("--fix-casing");
const JSON_OUTPUT = ARGS.includes("--json");

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

interface CollectionInfo {
  id: string;
  name: string;
  entityType: string;
  recordCount: number;
  lastWriteAt: string | null;
  staleDays: number | null;
  casingOk: boolean;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PATCH ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`POST ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Collection listing
// ---------------------------------------------------------------------------

interface RawCollection {
  id: string;
  name: string;
  entityType?: string;
  entity_type?: string;
  recordCount?: number;
  record_count?: number;
  lastWriteAt?: string;
  last_write_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

async function listCollections(): Promise<RawCollection[]> {
  try {
    const data = await apiGet<{ data?: RawCollection[]; collections?: RawCollection[] }>(
      "/api/v1/collections"
    );
    return data.data ?? data.collections ?? [];
  } catch (err) {
    console.error("Failed to list collections:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Record count via search
// ---------------------------------------------------------------------------

async function getRecordCount(collectionId: string): Promise<number> {
  try {
    const data = await apiPost<{ data?: { totalMatched?: number } }>(
      "/api/v1/search",
      { collectionIds: [collectionId], countOnly: true }
    );
    return data.data?.totalMatched ?? 0;
  } catch {
    return -1;
  }
}

// ---------------------------------------------------------------------------
// Recent writes check
// ---------------------------------------------------------------------------

async function getRecentWriteCount(
  collectionId: string,
  sinceDaysAgo: number
): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - sinceDaysAgo);

  try {
    const data = await apiPost<{ data?: { totalMatched?: number } }>(
      "/api/v1/search",
      {
        collectionIds: [collectionId],
        groups: [
          {
            conditions: [
              {
                propertyName: "updated_at",
                operator: "gte",
                value: since.toISOString(),
              },
            ],
          },
        ],
        countOnly: true,
      }
    );
    return data.data?.totalMatched ?? 0;
  } catch {
    // Fallback: can't determine recent writes
    return -1;
  }
}

// ---------------------------------------------------------------------------
// Entity type casing fix
// ---------------------------------------------------------------------------

async function fixEntityTypeCasing(
  collectionId: string,
  currentType: string
): Promise<boolean> {
  const lower = currentType.toLowerCase();
  if (lower === currentType) return true; // already lowercase

  console.log(`  Updating entityType: "${currentType}" -> "${lower}" ...`);
  try {
    await apiPatch(`/api/v1/collections/${collectionId}`, {
      entityType: lower,
    });
    console.log(`  OK`);
    return true;
  } catch (err) {
    console.error(`  FAILED:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!API_KEY) {
    console.error(
      "Error: PERSONIZE_SECRET_KEY (or PERSONIZE_API_KEY) not set.\n" +
        "Create a .env.local file or export the variable."
    );
    process.exit(1);
  }

  console.log("Personize Schema Audit");
  console.log("=".repeat(60));
  console.log(`API: ${API_BASE}`);
  console.log(`Mode: ${FIX_CASING ? "FIX CASING" : "read-only"}`);
  console.log();

  // Step 1: List all collections
  const rawCollections = await listCollections();

  if (rawCollections.length === 0) {
    console.log("No collections returned from API. Falling back to known collection IDs...\n");
  }

  // Merge known collections with API results
  const collectionMap = new Map<string, { name: string; raw?: RawCollection }>();

  for (const [name, id] of Object.entries(KNOWN_COLLECTIONS)) {
    collectionMap.set(id, { name });
  }

  for (const raw of rawCollections) {
    const existing = collectionMap.get(raw.id);
    collectionMap.set(raw.id, {
      name: existing?.name ?? raw.name ?? raw.id,
      raw,
    });
  }

  // Step 2: Gather info for each collection
  const results: CollectionInfo[] = [];

  for (const [id, { name, raw }] of collectionMap) {
    const entityType = raw?.entityType ?? raw?.entity_type ?? "unknown";
    const lastWrite = raw?.lastWriteAt ?? raw?.last_write_at ?? raw?.updatedAt ?? raw?.updated_at ?? null;

    let staleDays: number | null = null;
    if (lastWrite) {
      const diffMs = Date.now() - new Date(lastWrite).getTime();
      staleDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const recordCount = raw?.recordCount ?? raw?.record_count ?? await getRecordCount(id);
    const casingOk = entityType === entityType.toLowerCase();

    results.push({
      id,
      name,
      entityType,
      recordCount,
      lastWriteAt: lastWrite,
      staleDays,
      casingOk,
    });
  }

  // Step 3: Output
  if (JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    // Table output
    console.log(
      padRight("Collection", 35) +
        padRight("Entity Type", 15) +
        padRight("Records", 10) +
        padRight("Last Write", 22) +
        padRight("Stale?", 10) +
        "Casing"
    );
    console.log("-".repeat(100));

    for (const c of results) {
      const staleFlag =
        c.staleDays !== null && c.staleDays > STALE_THRESHOLD_DAYS
          ? `${c.staleDays}d ago!`
          : c.staleDays !== null
            ? `${c.staleDays}d ago`
            : "unknown";

      const casingFlag = c.casingOk ? "OK" : `MISMATCH (${c.entityType})`;

      console.log(
        padRight(c.name, 35) +
          padRight(c.entityType, 15) +
          padRight(String(c.recordCount), 10) +
          padRight(c.lastWriteAt ?? "unknown", 22) +
          padRight(staleFlag, 10) +
          casingFlag
      );
    }
  }

  // Step 4: Casing issues summary
  const casingIssues = results.filter((c) => !c.casingOk);
  if (casingIssues.length > 0) {
    console.log();
    console.log(`Casing issues found: ${casingIssues.length}`);
    for (const c of casingIssues) {
      console.log(`  - ${c.name}: entityType="${c.entityType}" (should be "${c.entityType.toLowerCase()}")`);
    }

    if (FIX_CASING) {
      console.log();
      console.log("Fixing casing...");
      for (const c of casingIssues) {
        await fixEntityTypeCasing(c.id, c.entityType);
      }
    } else {
      console.log("\nRun with --fix-casing to update.");
    }
  } else {
    console.log("\nAll entity types use consistent lowercase casing.");
  }

  // Step 5: Stale collections
  const staleCollections = results.filter(
    (c) => c.staleDays !== null && c.staleDays > STALE_THRESHOLD_DAYS
  );
  if (staleCollections.length > 0) {
    console.log();
    console.log("Stale collections (no writes in 14+ days):");
    for (const c of staleCollections) {
      const recentWrites = await getRecentWriteCount(c.id, 30);
      console.log(
        `  - ${c.name}: last write ${c.staleDays}d ago, ` +
          `writes in last 30d: ${recentWrites === -1 ? "unknown" : recentWrites}`
      );
    }
  }

  console.log();
  console.log("Done.");
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str + " " : str + " ".repeat(len - str.length);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
