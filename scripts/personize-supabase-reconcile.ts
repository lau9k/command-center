/**
 * Personize ↔ Supabase contact reconciliation script.
 *
 * Makes the Supabase contacts table the authoritative contact set.
 * Soft-deletes Personize contacts that have no matching Supabase row.
 * Syncs Supabase-only contacts back into Personize.
 *
 * Usage:
 *   npx tsx scripts/personize-supabase-reconcile.ts              (dry-run, default)
 *   npx tsx scripts/personize-supabase-reconcile.ts --execute     (live run)
 *
 * Requires env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   PERSONIZE_SECRET_KEY, PERSONIZE_CONTACTS_COLLECTION_ID
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import * as readline from "readline";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
      /* ignore missing file */
    }
  }
})();

// ---------------------------------------------------------------------------
// Config & clients
// ---------------------------------------------------------------------------

const EXECUTE = process.argv.includes("--execute");
const DRY_RUN = !EXECUTE;
const BATCH_SIZE = 50;
const RATE_LIMIT_MS = 500;
const ARCHIVE_THRESHOLD = 0.5; // abort if >50% would be archived
const WHITELIST_PATTERNS = ["lautaro@", "hamed@", "@personize.ai"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const personizeSecret = process.env.PERSONIZE_SECRET_KEY;
const collectionId =
  process.env.PERSONIZE_CONTACTS_COLLECTION_ID ??
  "5686312a-7ab7-4cef-897c-576bfeb92aec";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!personizeSecret) {
  console.error("Missing PERSONIZE_SECRET_KEY");
  process.exit(1);
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Lazy-load Personize SDK (needs env loaded first)
// ---------------------------------------------------------------------------

async function loadPersonizeClient() {
  const { Personize } = await import("@personize/sdk");
  return new Personize({ secretKey: personizeSecret! });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PersonizeRecord {
  recordId: string;
  email: string | null;
  name: string | null;
  company: string | null;
  linkedin_url: string | null;
  properties: Record<string, string>;
}

interface SupabaseContact {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  linkedin_url: string | null;
  status: string;
  personize_sync_status: string | null;
  personize_record_id: string | null;
}

interface ReconcileEntry {
  personize_id: string;
  supabase_id: string | null;
  identifier_used: string;
  identifier_type: "email" | "linkedin_url" | "name_company";
  decision: "keep" | "archive";
  reason: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isWhitelisted(email: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return WHITELIST_PATTERNS.some((p) => lower.includes(p));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeLinkedIn(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

function nameCompanyKey(name: string, company: string): string {
  return `${name.trim().toLowerCase()}::${company.trim().toLowerCase()}`;
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ---------------------------------------------------------------------------
// Step 1: Fetch all Personize contacts
// ---------------------------------------------------------------------------

async function fetchAllPersonizeContacts(
  client: InstanceType<Awaited<ReturnType<typeof loadPersonizeClient>> extends infer C ? { new (...a: unknown[]): C }["prototype"] extends infer P ? { new (): P } : never : never>
): Promise<PersonizeRecord[]> {
  // We use the raw search API for reliable pagination
  const apiBase = "https://agent.personize.ai";
  const apiKey = personizeSecret!;
  const all: PersonizeRecord[] = [];
  let page = 1;
  const pageSize = 200;

  console.log("Fetching all Personize contacts...");

  while (true) {
    const response = await fetch(`${apiBase}/api/v1/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collectionIds: [collectionId],
        returnRecords: true,
        pageSize,
        page,
      }),
    });

    if (!response.ok) {
      console.error(`Personize search failed (page ${page}): ${response.status}`);
      break;
    }

    const json = await response.json();
    const data = json?.data ?? json;
    const recordIds: string[] = data?.recordIds ?? [];
    const crmKeys: Record<string, { email?: string; type?: string }> =
      data?.crmKeys ?? {};
    const records: Record<string, Record<string, { value: string }>> =
      data?.records ?? {};
    const totalPages = data?.totalPages ?? 1;

    for (const rid of recordIds) {
      const crm = crmKeys[rid] ?? {};
      if (crm.type && crm.type !== "contact") continue;

      const props = records[rid] ?? {};
      const propValues: Record<string, string> = {};
      for (const [k, v] of Object.entries(props)) {
        if (v && typeof v === "object" && "value" in v) {
          propValues[k] = v.value;
        }
      }

      all.push({
        recordId: rid,
        email: crm.email ?? propValues.email ?? null,
        name: propValues.full_name ?? propValues.name ?? null,
        company: propValues.company_name ?? null,
        linkedin_url: propValues.linkedin_url ?? null,
        properties: propValues,
      });
    }

    console.log(`  Page ${page}/${totalPages}: ${recordIds.length} records`);

    if (page >= totalPages) break;
    page++;
    await delay(300);
  }

  console.log(`  Total Personize contacts: ${all.length}`);
  return all;
}

// ---------------------------------------------------------------------------
// Step 2: Fetch all Supabase contacts
// ---------------------------------------------------------------------------

async function fetchAllSupabaseContacts(): Promise<SupabaseContact[]> {
  console.log("Fetching all Supabase contacts...");
  const all: SupabaseContact[] = [];
  let offset = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, name, email, company, linkedin_url, status, personize_sync_status, personize_record_id"
      )
      .is("deleted_at", null)
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("Supabase fetch error:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    all.push(...(data as SupabaseContact[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  console.log(`  Total Supabase contacts (active): ${all.length}`);
  return all;
}

// ---------------------------------------------------------------------------
// Step 3: Match Personize → Supabase
// ---------------------------------------------------------------------------

function buildSupabaseIndexes(contacts: SupabaseContact[]) {
  const byEmail = new Map<string, SupabaseContact>();
  const byLinkedIn = new Map<string, SupabaseContact>();
  const byNameCompany = new Map<string, SupabaseContact>();

  for (const c of contacts) {
    if (c.email) byEmail.set(normalizeEmail(c.email), c);
    if (c.linkedin_url) byLinkedIn.set(normalizeLinkedIn(c.linkedin_url), c);
    if (c.name && c.company) byNameCompany.set(nameCompanyKey(c.name, c.company), c);
  }

  return { byEmail, byLinkedIn, byNameCompany };
}

function reconcile(
  personizeContacts: PersonizeRecord[],
  supabaseContacts: SupabaseContact[]
): ReconcileEntry[] {
  const idx = buildSupabaseIndexes(supabaseContacts);
  const entries: ReconcileEntry[] = [];

  for (const pz of personizeContacts) {
    // Try email match first
    if (pz.email) {
      const email = normalizeEmail(pz.email);
      const match = idx.byEmail.get(email);
      if (match) {
        entries.push({
          personize_id: pz.recordId,
          supabase_id: match.id,
          identifier_used: email,
          identifier_type: "email",
          decision: "keep",
          reason: "email match",
        });
        continue;
      }
    }

    // Try linkedin_url match
    if (pz.linkedin_url) {
      const url = normalizeLinkedIn(pz.linkedin_url);
      const match = idx.byLinkedIn.get(url);
      if (match) {
        entries.push({
          personize_id: pz.recordId,
          supabase_id: match.id,
          identifier_used: url,
          identifier_type: "linkedin_url",
          decision: "keep",
          reason: "linkedin_url match",
        });
        continue;
      }
    }

    // Try name+company match
    if (pz.name && pz.company) {
      const key = nameCompanyKey(pz.name, pz.company);
      const match = idx.byNameCompany.get(key);
      if (match) {
        entries.push({
          personize_id: pz.recordId,
          supabase_id: match.id,
          identifier_used: key,
          identifier_type: "name_company",
          decision: "keep",
          reason: "name+company match",
        });
        continue;
      }
    }

    // Check whitelist before marking as archive candidate
    if (isWhitelisted(pz.email)) {
      entries.push({
        personize_id: pz.recordId,
        supabase_id: null,
        identifier_used: pz.email ?? pz.name ?? pz.recordId,
        identifier_type: pz.email ? "email" : "name_company",
        decision: "keep",
        reason: "whitelisted email",
      });
      continue;
    }

    // No match — archive candidate
    const bestId = pz.email ?? pz.linkedin_url ?? (pz.name ? `${pz.name}::${pz.company ?? ""}` : pz.recordId);
    const idType: ReconcileEntry["identifier_type"] = pz.email
      ? "email"
      : pz.linkedin_url
        ? "linkedin_url"
        : "name_company";

    entries.push({
      personize_id: pz.recordId,
      supabase_id: null,
      identifier_used: bestId,
      identifier_type: idType,
      decision: "archive",
      reason: "no matching Supabase contact",
    });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Step 4: Write CSV report
// ---------------------------------------------------------------------------

function writeCsvReport(entries: ReconcileEntry[]): string {
  const outputDir = resolve("scripts/output");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, "reconcile-report.csv");

  const header = "personize_id,supabase_id,identifier_used,identifier_type,decision,reason";
  const rows = entries.map((e) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      escape(e.personize_id),
      escape(e.supabase_id ?? ""),
      escape(e.identifier_used),
      escape(e.identifier_type),
      escape(e.decision),
      escape(e.reason),
    ].join(",");
  });

  writeFileSync(outputPath, [header, ...rows].join("\n"), "utf-8");
  return outputPath;
}

// ---------------------------------------------------------------------------
// Step 5: Execute archival in Personize
// ---------------------------------------------------------------------------

async function archivePersonizeContacts(
  entries: ReconcileEntry[]
): Promise<{ archived: number; errors: string[] }> {
  const toArchive = entries.filter((e) => e.decision === "archive");
  const apiBase = "https://agent.personize.ai";
  const apiKey = personizeSecret!;
  let archived = 0;
  const errors: string[] = [];

  console.log(`\nArchiving ${toArchive.length} Personize contacts...`);

  for (let i = 0; i < toArchive.length; i += BATCH_SIZE) {
    const batch = toArchive.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toArchive.length / BATCH_SIZE);

    console.log(`  Batch ${batchNum}/${totalBatches} (${batch.length} records)...`);

    for (const entry of batch) {
      try {
        // Set archive_status property on the Personize record
        const response = await fetch(
          `${apiBase}/api/v1/records/${entry.personize_id}/properties`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              properties: {
                archive_status: "archived",
                archive_reason: entry.reason,
                archived_at: new Date().toISOString(),
              },
            }),
          }
        );

        if (!response.ok) {
          // Fallback: memorize an archive marker
          const { Personize } = await import("@personize/sdk");
          const client = new Personize({ secretKey: personizeSecret! });
          await client.memory.save({
            content: `ARCHIVED: ${entry.reason}. Record ${entry.personize_id} archived during Personize↔Supabase reconciliation.`,
          });
        }

        archived++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${entry.personize_id}: ${msg}`);
      }
    }

    if (i + BATCH_SIZE < toArchive.length) {
      await delay(RATE_LIMIT_MS);
    }
  }

  return { archived, errors };
}

// ---------------------------------------------------------------------------
// Step 6: Reverse sync — Supabase-only contacts → Personize
// ---------------------------------------------------------------------------

async function reverseSync(supabaseContacts: SupabaseContact[]): Promise<{
  synced: number;
  errors: string[];
}> {
  const unsynced = supabaseContacts.filter(
    (c) => c.personize_sync_status !== "synced"
  );

  console.log(`\nReverse sync: ${unsynced.length} Supabase contacts need Personize sync`);

  if (unsynced.length === 0 || DRY_RUN) {
    if (DRY_RUN && unsynced.length > 0) {
      console.log("  (skipped in dry-run mode)");
    }
    return { synced: 0, errors: [] };
  }

  const { Personize } = await import("@personize/sdk");
  const client = new Personize({ secretKey: personizeSecret! });
  let synced = 0;
  const errors: string[] = [];

  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(unsynced.length / BATCH_SIZE);

    console.log(`  Batch ${batchNum}/${totalBatches}...`);

    for (const contact of batch) {
      try {
        const parts = [`Contact: ${contact.name}`];
        if (contact.email) parts.push(`Email: ${contact.email}`);
        if (contact.company) parts.push(`Company: ${contact.company}`);

        await client.memory.save({
          content: parts.join("\n"),
          ...(contact.email ? { email: contact.email } : {}),
        });

        // Update Supabase sync status
        const now = new Date().toISOString();
        await supabase
          .from("contacts")
          .update({
            personize_sync_status: "synced",
            personize_synced_at: now,
          })
          .eq("id", contact.id);

        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${contact.id} (${contact.name}): ${msg}`);

        await supabase
          .from("contacts")
          .update({ personize_sync_status: "failed" })
          .eq("id", contact.id);
      }
    }

    if (i + BATCH_SIZE < unsynced.length) {
      await delay(RATE_LIMIT_MS);
    }
  }

  return { synced, errors };
}

// ---------------------------------------------------------------------------
// Step 7: Log to reconcile_log table
// ---------------------------------------------------------------------------

async function writeReconcileLog(
  runId: string,
  entries: ReconcileEntry[],
  reverseSyncContacts: SupabaseContact[]
): Promise<void> {
  if (DRY_RUN) {
    console.log("\n  (reconcile_log writes skipped in dry-run mode)");
    return;
  }

  console.log("\nWriting reconcile_log entries...");

  // Log Personize→Supabase reconciliation entries
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const rows = batch.map((e) => ({
      run_id: runId,
      direction: "personize_archive" as const,
      decision: e.decision,
      personize_id: e.personize_id,
      supabase_id: e.supabase_id,
      identifier_used: e.identifier_used,
      identifier_type: e.identifier_type,
      reason: e.reason,
    }));

    const { error } = await supabase.from("reconcile_log").insert(rows);
    if (error) {
      console.error(`  reconcile_log insert error (batch): ${error.message}`);
    }
  }

  // Log reverse sync entries
  const unsyncedRows = reverseSyncContacts
    .filter((c) => c.personize_sync_status !== "synced")
    .map((c) => ({
      run_id: runId,
      direction: "supabase_to_personize" as const,
      decision: "create" as const,
      personize_id: null,
      supabase_id: c.id,
      identifier_used: c.email ?? c.name,
      identifier_type: c.email ? ("email" as const) : ("name_company" as const),
      reason: "supabase contact not in Personize",
    }));

  if (unsyncedRows.length > 0) {
    for (let i = 0; i < unsyncedRows.length; i += BATCH_SIZE) {
      const batch = unsyncedRows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from("reconcile_log").insert(batch);
      if (error) {
        console.error(`  reconcile_log insert error (reverse sync): ${error.message}`);
      }
    }
  }

  console.log(
    `  Logged ${entries.length + unsyncedRows.length} reconcile_log entries`
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(64));
  console.log("  Personize ↔ Supabase Contact Reconciliation");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "EXECUTE (live writes)"}`);
  console.log("=".repeat(64));
  console.log();

  const runId = crypto.randomUUID();

  // 1. Fetch all contacts from both systems
  const personizeContacts = await fetchAllPersonizeContacts(null as never);
  const supabaseContacts = await fetchAllSupabaseContacts();

  // 2. Reconcile
  console.log("\nReconciling...");
  const entries = reconcile(personizeContacts, supabaseContacts);

  const keepCount = entries.filter((e) => e.decision === "keep").length;
  const archiveCount = entries.filter((e) => e.decision === "archive").length;
  const archiveRate = entries.length > 0 ? archiveCount / entries.length : 0;

  console.log(`  Keep: ${keepCount}`);
  console.log(`  Archive: ${archiveCount}`);
  console.log(`  Archive rate: ${(archiveRate * 100).toFixed(1)}%`);

  // 3. Write CSV report (always, even in execute mode)
  const csvPath = writeCsvReport(entries);
  console.log(`\n  CSV report: ${csvPath}`);

  // 4. Safety checks for execute mode
  if (EXECUTE) {
    // Safety check: abort if archive rate >50%
    if (archiveRate > ARCHIVE_THRESHOLD) {
      console.error(
        `\n❌ ABORT: Archive rate (${(archiveRate * 100).toFixed(1)}%) exceeds ` +
          `safety threshold (${ARCHIVE_THRESHOLD * 100}%). Review the CSV report.`
      );
      process.exit(1);
    }

    // Safety check: verify all whitelisted emails are in keep list
    const whitelistArchived = entries.filter(
      (e) => e.decision === "archive" && isWhitelisted(e.identifier_used)
    );
    if (whitelistArchived.length > 0) {
      console.error(
        `\n❌ ABORT: ${whitelistArchived.length} whitelisted contacts would be archived:`
      );
      for (const e of whitelistArchived) {
        console.error(`    ${e.identifier_used} (${e.personize_id})`);
      }
      process.exit(1);
    }

    // Require explicit confirmation
    const proceed = await confirm(
      `\nAbout to archive ${archiveCount} records. Proceed? [y/N] `
    );
    if (!proceed) {
      console.log("Aborted by user.");
      process.exit(0);
    }

    // 5. Execute archival
    const archiveResult = await archivePersonizeContacts(entries);
    console.log(`  Archived: ${archiveResult.archived}`);
    if (archiveResult.errors.length > 0) {
      console.log(`  Errors: ${archiveResult.errors.length}`);
      for (const err of archiveResult.errors.slice(0, 10)) {
        console.error(`    ${err}`);
      }
    }
  }

  // 6. Reverse sync (Supabase-only → Personize)
  const reverseSyncResult = await reverseSync(supabaseContacts);

  // 7. Log to reconcile_log
  await writeReconcileLog(runId, entries, supabaseContacts);

  // 8. Summary
  console.log("\n" + "=".repeat(64));
  console.log("  SUMMARY");
  console.log("=".repeat(64));
  console.log(`  Mode:                    ${DRY_RUN ? "DRY RUN" : "EXECUTED"}`);
  console.log(`  Run ID:                  ${runId}`);
  console.log(`  Personize contacts:      ${personizeContacts.length}`);
  console.log(`  Supabase contacts:       ${supabaseContacts.length}`);
  console.log(`  Matched (keep):          ${keepCount}`);
  console.log(`  Archive candidates:      ${archiveCount}`);
  console.log(`  Archive rate:            ${(archiveRate * 100).toFixed(1)}%`);
  if (!DRY_RUN) {
    console.log(`  Reverse sync created:    ${reverseSyncResult.synced}`);
    console.log(`  Reverse sync errors:     ${reverseSyncResult.errors.length}`);
  } else {
    const unsyncedCount = supabaseContacts.filter(
      (c) => c.personize_sync_status !== "synced"
    ).length;
    console.log(`  Reverse sync pending:    ${unsyncedCount}`);
  }
  console.log(`  CSV report:              ${csvPath}`);
  console.log("=".repeat(64));

  if (DRY_RUN) {
    console.log("\nThis was a dry run. Review the CSV, then pass --execute to apply changes.");
  }
}

main().catch((err) => {
  console.error("Reconciliation failed:", err);
  process.exit(1);
});
