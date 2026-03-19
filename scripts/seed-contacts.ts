/**
 * Seed contacts from LinkedIn CSV export into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-contacts.ts [path/to/csv]
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional env var:  SEED_USER_ID — assigns all contacts to this user
 */

import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CSV_PATH =
  process.argv[2] ??
  path.resolve(__dirname, "../../data/hackathon-outreach-contacts.csv");

const BATCH_SIZE = 50;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.SEED_USER_ID;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Field normalization
// ---------------------------------------------------------------------------

type RawRow = Record<string, string>;

/** Normalize a CSV header to a lowercase snake_case key. */
function normalizeKey(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Get a value from a row trying multiple possible field names. */
function pick(row: RawRow, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const val = row[k]?.trim();
    if (val) return val;
  }
  return undefined;
}

interface MappedContact {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  tags: string[];
  source: string;
  notes?: string;
}

function mapRow(raw: RawRow): MappedContact | null {
  // Normalize all keys
  const row: RawRow = {};
  for (const [k, v] of Object.entries(raw)) {
    row[normalizeKey(k)] = v;
  }

  const firstName = pick(row, "first_name", "firstname", "first") ?? "";
  const lastName = pick(row, "last_name", "lastname", "last") ?? "";
  const name = `${firstName} ${lastName}`.trim();

  const email = pick(row, "email", "email_address", "emailaddress");

  // Skip rows with no name and no email
  if (!name && !email) return null;

  const linkedinUrl = pick(row, "linkedin_url", "url", "profile_url", "linkedin");

  return {
    name: name || email!,
    email: email || undefined,
    phone: pick(row, "phone", "phone_number", "phonenumber") || undefined,
    company: pick(row, "company", "company_name", "companyname", "organization") || undefined,
    role: pick(row, "position", "job_title", "jobtitle", "title", "role") || undefined,
    tags: pick(row, "tags") ? pick(row, "tags")!.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : [],
    source: "linkedin",
    notes: linkedinUrl ? `LinkedIn: ${linkedinUrl}` : undefined,
  };
}

// ---------------------------------------------------------------------------
// Upsert logic (mirrors seed API endpoint)
// ---------------------------------------------------------------------------

interface BatchResult {
  inserted: number;
  updated: number;
  skipped: number;
}

async function upsertBatch(contacts: MappedContact[]): Promise<BatchResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const record = {
      ...contact,
      ...(userId ? { user_id: userId } : {}),
    };

    if (contact.email) {
      const { data: existing } = await supabase
        .from("contacts")
        .select("id")
        .eq("email", contact.email)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("contacts")
          .update(record)
          .eq("id", existing.id);

        if (error) {
          console.error(`  Failed to update ${contact.email}: ${error.message}`);
          skipped++;
        } else {
          updated++;
        }
        continue;
      }
    }

    const { error } = await supabase.from("contacts").insert(record);

    if (error) {
      console.error(`  Failed to insert ${contact.name}: ${error.message}`);
      skipped++;
    } else {
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Reading CSV from: ${CSV_PATH}`);

  if (!fs.existsSync(CSV_PATH)) {
    console.error(`File not found: ${CSV_PATH}`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const { data: rows, errors } = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    console.warn(`CSV parse warnings: ${errors.length}`);
    for (const e of errors.slice(0, 5)) {
      console.warn(`  Row ${e.row}: ${e.message}`);
    }
  }

  const contacts = rows.map(mapRow).filter((c): c is MappedContact => c !== null);

  console.log(`Parsed ${rows.length} rows → ${contacts.length} valid contacts`);

  if (contacts.length === 0) {
    console.log("No valid contacts to seed.");
    return;
  }

  const totalBatches = Math.ceil(contacts.length / BATCH_SIZE);
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < totalBatches; i++) {
    const batch = contacts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    const result = await upsertBatch(batch);

    totalInserted += result.inserted;
    totalUpdated += result.updated;
    totalSkipped += result.skipped;

    console.log(
      `Batch ${i + 1}/${totalBatches}: ${batch.length} contacts processed ` +
        `(${result.inserted} new, ${result.updated} updated, ${result.skipped} skipped)`,
    );
  }

  console.log(
    `\nDone! ${totalInserted} inserted, ${totalUpdated} updated, ${totalSkipped} skipped ` +
      `(${contacts.length} total)`,
  );
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
