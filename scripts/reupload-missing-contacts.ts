/**
 * Re-upload missing Apollo contacts to Personize.
 *
 * Session 049 bulk-memorized 3,017 contacts but stopped at ~2,241
 * when credits ran out. This script:
 *   1. Paginates all existing Personize contacts to get their emails
 *   2. Parses the two source Apollo CSVs
 *   3. Diffs to find missing contacts
 *   4. Uploads missing contacts via Personize SDK directly
 *   5. Verifies final count
 *
 * Usage: npx tsx scripts/reupload-missing-contacts.ts
 */

// Load .env.local before any SDK imports (imports are hoisted in ESM)
import { readFileSync } from "fs";
import { resolve } from "path";

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
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    } catch { /* ignore */ }
  }
})();

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COLLECTION_ID = process.env.PERSONIZE_CONTACTS_COLLECTION_ID!;
const SECRET_KEY = process.env.PERSONIZE_SECRET_KEY!;

if (!COLLECTION_ID || !SECRET_KEY) {
  console.error("Missing PERSONIZE_CONTACTS_COLLECTION_ID or PERSONIZE_SECRET_KEY in .env.local");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Lazy-load SDK and CSV parser (after env is set)
// ---------------------------------------------------------------------------

async function loadDeps() {
  const { Personize } = await import("@personize/sdk");
  const papaparse = await import("papaparse");
  const parse = papaparse.default?.parse ?? papaparse.parse;
  const client = new Personize({ secretKey: SECRET_KEY });
  return { client, parse };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchPageData {
  recordIds?: string[];
  totalMatched?: number;
  totalPages?: number;
  crmKeys?: Record<string, { type?: string; email?: string }>;
}

interface ApolloRow {
  "First Name"?: string;
  "Last Name"?: string;
  Email?: string;
  Title?: string;
  "Company Name"?: string;
  "Person Linkedin Url"?: string;
  Website?: string;
  "Mobile Phone"?: string;
  "Work Direct Phone"?: string;
  "Corporate Phone"?: string;
  Industry?: string;
  City?: string;
  Country?: string;
}

interface Contact {
  email: string;
  first_name: string | null;
  last_name: string | null;
  job_title: string | null;
  company_name: string | null;
  linkedin_url: string | null;
  website: string | null;
  phone: string | null;
  industry: string | null;
  city: string | null;
  country: string | null;
  source: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_BASE =
  "/Users/lautaro/Library/Application Support/Claude/local-agent-mode-sessions/" +
  "b15946fd-8d0d-4f5e-b342-44e05bf63b35/edc2edc5-97a7-4d57-a2f4-8d8230df3c7b/" +
  "local_cf38d8ce-f7ed-4ef4-a8ef-af310e257dff/uploads";

const CSV_PATHS = [
  `${SESSION_BASE}/Victoria Saved (In Apollo) Contacts.csv`,
  `${SESSION_BASE}/Hackathon Invite List.csv`,
];

const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 2000;
const COLLECTION_NAME = "Contacts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function contactToRow(c: Contact): Record<string, unknown> {
  const location = [c.city, c.country].filter(Boolean).join(", ") || "";
  return {
    email: c.email,
    full_name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim(),
    job_title: c.job_title ?? "",
    company_name: c.company_name ?? "",
    linkedin_url: c.linkedin_url ?? "",
    website: c.website ?? "",
    phone: c.phone ?? "",
    industry: c.industry ?? "",
    location,
    source: c.source,
  };
}

function buildMapping() {
  const prop = (sourceField: string) => ({
    sourceField,
    collectionId: COLLECTION_ID,
    collectionName: COLLECTION_NAME,
    extractMemories: false,
  });
  return {
    entityType: "contact",
    email: "email",
    properties: {
      email: prop("email"),
      full_name: prop("full_name"),
      job_title: prop("job_title"),
      company_name: prop("company_name"),
      linkedin_url: prop("linkedin_url"),
      website: prop("website"),
      phone: prop("phone"),
      industry: prop("industry"),
      location: prop("location"),
      source: prop("source"),
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Re-upload Missing Apollo Contacts ===\n");

  const { client, parse } = await loadDeps();

  // Step 1: Get all emails currently in Personize
  console.log("Step 1: Fetching existing Personize contacts...");
  const existingEmails = new Set<string>();
  let page = 1;
  const pageSize = 200;

  for (;;) {
    const response = await client.memory.search({
      collectionIds: [COLLECTION_ID],
      pageSize,
      page,
    });

    const data = (response?.data ?? response) as SearchPageData;

    if (page === 1) {
      console.log(`Personize reports ${data?.totalMatched ?? 0} total contacts`);
    }

    if (data?.crmKeys) {
      for (const [, info] of Object.entries(data.crmKeys)) {
        if (info?.email) existingEmails.add(info.email.toLowerCase().trim());
      }
    }

    const totalPages = data?.totalPages ?? 1;
    if (page >= totalPages) break;
    page++;
  }

  console.log(`Extracted ${existingEmails.size} unique emails from Personize (${page} pages)`);

  // Step 2: Parse source CSVs
  console.log("\nStep 2: Parsing source Apollo CSVs...");
  const sourceByEmail = new Map<string, ApolloRow>();

  for (const csvPath of CSV_PATHS) {
    const raw = readFileSync(csvPath, "utf-8");
    const result = parse<ApolloRow>(raw, { header: true, skipEmptyLines: true });
    console.log(`Parsed ${result.data.length} rows from ${csvPath.split("/").pop()}`);
    for (const row of result.data) {
      const email = row.Email?.toLowerCase().trim();
      if (email) sourceByEmail.set(email, row);
    }
  }

  console.log(`Unique source emails: ${sourceByEmail.size}`);

  // Step 3: Diff
  console.log("\nStep 3: Identifying missing contacts...");
  const missing: Contact[] = [];

  for (const [email, row] of sourceByEmail) {
    if (existingEmails.has(email)) continue;
    const phone = row["Mobile Phone"] || row["Work Direct Phone"] || row["Corporate Phone"] || null;
    missing.push({
      email,
      first_name: row["First Name"] || null,
      last_name: row["Last Name"] || null,
      job_title: row.Title || null,
      company_name: row["Company Name"] || null,
      linkedin_url: row["Person Linkedin Url"] || null,
      website: row.Website || null,
      phone: phone ? phone.replace(/'/g, "") : null,
      industry: row.Industry || null,
      city: row.City || null,
      country: row.Country || null,
      source: "apollo-reupload",
    });
  }

  console.log(`Found ${missing.length} contacts missing from Personize`);

  if (missing.length === 0) {
    console.log("Nothing to upload — all contacts already in Personize!");
    return;
  }

  console.log("Sample missing contacts:");
  for (const c of missing.slice(0, 5)) {
    console.log(`  ${c.first_name} ${c.last_name} <${c.email}> @ ${c.company_name}`);
  }

  // Step 4: Upload in batches
  console.log(`\nStep 4: Uploading ${missing.length} missing contacts (batch size ${BATCH_SIZE}, ${RATE_LIMIT_MS}ms delay)...`);

  const mapping = buildMapping();
  const totalBatches = Math.ceil(missing.length / BATCH_SIZE);
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < totalBatches; i++) {
    const chunk = missing.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const rows = chunk.map(contactToRow);

    try {
      await client.memory.memorizeBatch({
        source: "csv-import",
        mapping,
        rows,
      });
      succeeded += chunk.length;
      console.log(`Batch ${i + 1}/${totalBatches}: uploaded ${succeeded + failed}/${missing.length} contacts`);
    } catch (err) {
      failed += chunk.length;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Batch ${i + 1}/${totalBatches}: FAILED (${chunk.length} contacts) — ${msg}`);
    }

    if (i < totalBatches - 1) await delay(RATE_LIMIT_MS);
  }

  console.log(`\nUpload complete: ${succeeded} succeeded, ${failed} failed`);

  // Step 5: Verify
  console.log("\nStep 5: Verifying final count...");
  const verifyResponse = await client.memory.search({
    collectionIds: [COLLECTION_ID],
    pageSize: 1,
    page: 1,
  });
  const verifyData = (verifyResponse?.data ?? verifyResponse) as SearchPageData;
  const finalCount = verifyData?.totalMatched ?? 0;
  console.log(`Final Personize contact count: ${finalCount}`);

  if (finalCount >= 2900) {
    console.log(`SUCCESS: Final count ${finalCount} >= 2,900 target`);
  } else {
    console.log(
      `WARNING: Final count ${finalCount} < 2,900 target. ` +
        `Personize indexing may still be processing — re-check in a few minutes.`
    );
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
