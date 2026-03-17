/**
 * Seed outreach tasks from hackathon contact CSV.
 *
 * Usage:
 *   node scripts/seed-outreach-tasks.mjs
 *   node scripts/seed-outreach-tasks.mjs --csv path/to/contacts.csv
 *
 * Requires env vars (or scripts/.env):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HACKATHON_PROJECT_ID
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Env loading — try scripts/.env then project root .env.local
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // File doesn't exist — that's fine
  }
}

loadEnvFile(resolve(__dirname, ".env"));
loadEnvFile(resolve(__dirname, "..", ".env.local"));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = process.env.HACKATHON_PROJECT_ID || null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// CSV parsing (lightweight — no external dep)
// ---------------------------------------------------------------------------

function parseCSV(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV has no data rows");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    // Handle quoted fields with commas
    const values = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

// ---------------------------------------------------------------------------
// Message template
// ---------------------------------------------------------------------------

function buildMessage(firstName, isWarm) {
  const warmOpener = isWarm
    ? "It's been a minute — hope you're doing well!\n\n"
    : "";

  return `${warmOpener}Hey ${firstName} — quick heads up on something I think you'd be interested in.

We're running a Healthcare AI Hackathon on March 27-28 at UVic (Engineering Building). 12 hours, 4 challenge tracks: clinical documentation, diagnostic decision support, patient access, and research equity.

What makes it different: real API access to healthcare platforms, mentors from industry on-site both days, and winning teams get accelerator mentorship + industry intros.

Apply here: https://forms.gle/CgKQ9xrBrGwad9Zg6`;
}

// ---------------------------------------------------------------------------
// Priority logic
// ---------------------------------------------------------------------------

function getPriority(tier, isWarm) {
  if (tier === "tier-1" && isWarm) return "high";
  if (tier === "tier-1") return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Resolve CSV path from --csv flag or default
  const csvFlagIdx = process.argv.indexOf("--csv");
  const csvPath =
    csvFlagIdx !== -1 && process.argv[csvFlagIdx + 1]
      ? resolve(process.argv[csvFlagIdx + 1])
      : resolve(__dirname, "..", "hackathon-outreach-priority.csv");

  console.log(`[seed] Reading CSV from: ${csvPath}`);
  const contacts = parseCSV(csvPath);
  console.log(`[seed] Found ${contacts.length} contacts in CSV\n`);

  const stats = { tier1: 0, tier2: 0, errors: 0, skipped: 0 };

  for (const row of contacts) {
    const name = row.name || `${row.first_name || ""} ${row.last_name || ""}`.trim();
    const firstName = row.first_name || name.split(" ")[0];
    const company = row.company || row.organization || "";
    const linkedinUrl = row.linkedin_url || row.linkedin || "";
    const tier = (row.tier || "tier-2").toLowerCase().trim();
    const hasConversation =
      (row.has_conversation || row.warm || "").toLowerCase().trim();
    const isWarm = ["true", "yes", "1", "warm"].includes(hasConversation);
    const warmCold = isWarm ? "warm" : "cold";

    if (!name) {
      console.warn(`[seed] Skipping row — no name found`);
      stats.skipped++;
      continue;
    }

    try {
      // 1. Upsert contact
      const contactData = {
        name,
        company,
        linkedin_url: linkedinUrl,
        source: "hackathon-outreach",
        qualified_status: "new",
        ...(PROJECT_ID && { project_id: PROJECT_ID }),
      };

      const { data: contact, error: contactErr } = await supabase
        .from("contacts")
        .upsert(contactData, { onConflict: "linkedin_url" })
        .select("id")
        .single();

      if (contactErr) throw new Error(`Contact upsert: ${contactErr.message}`);

      // 2. Create outreach task
      const priority = getPriority(tier, isWarm);
      const taskData = {
        title: `Outreach: ${name} — ${company}`,
        description: buildMessage(firstName, isWarm),
        status: "todo",
        priority,
        tags: [tier, warmCold, "outreach"],
        context: linkedinUrl,
        ...(PROJECT_ID && { project_id: PROJECT_ID }),
      };

      const { error: taskErr } = await supabase
        .from("tasks")
        .upsert(taskData, { onConflict: "title" })
        .select("id")
        .single();

      if (taskErr) throw new Error(`Task upsert: ${taskErr.message}`);

      if (tier === "tier-1") stats.tier1++;
      else stats.tier2++;

      process.stdout.write(".");
    } catch (err) {
      stats.errors++;
      console.error(`\n[seed] Error processing ${name}: ${err.message}`);
    }
  }

  console.log("\n");
  console.log(
    `[seed] Created ${stats.tier1} tier-1 tasks, ${stats.tier2} tier-2 tasks, ${stats.errors} errors`
  );
  if (stats.skipped) console.log(`[seed] Skipped ${stats.skipped} rows`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed] Fatal error:", err);
    process.exit(1);
  });
