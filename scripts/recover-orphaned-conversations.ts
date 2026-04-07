/**
 * Recover orphaned conversations by creating contacts from conversation metadata.
 *
 * Background: n8n LinkedIn sync on Apr 4-5, 2026 created ~814 conversations
 * with contact_id references to non-existent contacts. This script extracts
 * contact info from conversation metadata, creates contacts, and re-links them.
 *
 * Usage:
 *   npx tsx scripts/recover-orphaned-conversations.ts --dry-run   (default)
 *   npx tsx scripts/recover-orphaned-conversations.ts --execute
 *
 * Requires env vars (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env.local before anything else
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
// Config
// ---------------------------------------------------------------------------

const EXECUTE = process.argv.includes("--execute");
const DRY_RUN = !EXECUTE;
const BATCH_SIZE = 50;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Ensure .env.local is loaded.",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrphanedConversation {
  id: string;
  user_id: string;
  project_id: string | null;
  contact_id: string | null;
  subject?: string | null;
  summary?: string | null;
  metadata: Record<string, unknown>;
  participants?: unknown;
}

interface ExtractedContact {
  name: string;
  email?: string;
  linkedin_url?: string;
  company?: string;
  role?: string;
  phone?: string;
}

interface ContactKey {
  /** Dedup key: linkedin_url if available, otherwise "name::company" */
  key: string;
  contact: ExtractedContact;
  user_id: string;
  project_id: string | null;
  conversation_ids: string[];
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

function extractFromMetadata(
  metadata: Record<string, unknown>,
): Partial<ExtractedContact> {
  const result: Partial<ExtractedContact> = {};

  // Direct fields
  if (typeof metadata.name === "string" && metadata.name.trim()) {
    result.name = metadata.name.trim();
  }
  if (
    typeof metadata.full_name === "string" &&
    metadata.full_name.trim() &&
    !result.name
  ) {
    result.name = metadata.full_name.trim();
  }
  if (typeof metadata.first_name === "string") {
    const first = metadata.first_name.trim();
    const last =
      typeof metadata.last_name === "string" ? metadata.last_name.trim() : "";
    if (first && !result.name) {
      result.name = `${first} ${last}`.trim();
    }
  }

  if (typeof metadata.linkedin_url === "string" && metadata.linkedin_url.trim()) {
    result.linkedin_url = metadata.linkedin_url.trim();
  }
  if (
    typeof metadata.linkedinUrl === "string" &&
    metadata.linkedinUrl.trim() &&
    !result.linkedin_url
  ) {
    result.linkedin_url = metadata.linkedinUrl.trim();
  }
  if (
    typeof metadata.profile_url === "string" &&
    metadata.profile_url.includes("linkedin") &&
    !result.linkedin_url
  ) {
    result.linkedin_url = metadata.profile_url.trim();
  }

  if (typeof metadata.email === "string" && metadata.email.includes("@")) {
    result.email = metadata.email.trim().toLowerCase();
  }

  if (typeof metadata.company === "string" && metadata.company.trim()) {
    result.company = metadata.company.trim();
  }
  if (
    typeof metadata.organization === "string" &&
    metadata.organization.trim() &&
    !result.company
  ) {
    result.company = metadata.organization.trim();
  }

  if (typeof metadata.role === "string" && metadata.role.trim()) {
    result.role = metadata.role.trim();
  }
  if (
    typeof metadata.job_title === "string" &&
    metadata.job_title.trim() &&
    !result.role
  ) {
    result.role = metadata.job_title.trim();
  }
  if (
    typeof metadata.position === "string" &&
    metadata.position.trim() &&
    !result.role
  ) {
    result.role = metadata.position.trim();
  }
  if (
    typeof metadata.title === "string" &&
    metadata.title.trim() &&
    !result.role
  ) {
    result.role = metadata.title.trim();
  }

  if (typeof metadata.phone === "string" && metadata.phone.trim()) {
    result.phone = metadata.phone.trim();
  }

  // Check nested contact object
  if (metadata.contact && typeof metadata.contact === "object") {
    const nested = extractFromMetadata(
      metadata.contact as Record<string, unknown>,
    );
    return { ...nested, ...result }; // Direct fields take priority
  }

  return result;
}

function extractFromParticipants(
  participants: unknown,
): Partial<ExtractedContact> {
  if (!participants) return {};

  // participants might be an array of objects or strings
  const arr = Array.isArray(participants) ? participants : [];
  for (const p of arr) {
    if (typeof p === "object" && p !== null) {
      const obj = p as Record<string, unknown>;
      const name =
        typeof obj.name === "string" ? obj.name.trim() : undefined;
      const email =
        typeof obj.email === "string" && obj.email.includes("@")
          ? obj.email.trim().toLowerCase()
          : undefined;
      if (name || email) {
        return {
          name: name || undefined,
          email,
          linkedin_url:
            typeof obj.linkedin_url === "string"
              ? obj.linkedin_url.trim()
              : undefined,
        };
      }
    }
  }
  return {};
}

function extractFromSubject(subject: string | null | undefined): Partial<ExtractedContact> {
  if (!subject) return {};
  // Try to extract a name from subjects like "Conversation with John Doe"
  const match = subject.match(/(?:conversation|chat|thread)\s+with\s+(.+)/i);
  if (match) {
    return { name: match[1].trim() };
  }
  return {};
}

function extractContact(conv: OrphanedConversation): ExtractedContact | null {
  const fromMeta = extractFromMetadata(conv.metadata || {});
  const fromParticipants = extractFromParticipants(conv.participants);
  const fromSubject = extractFromSubject(conv.subject || conv.summary);

  // Merge: metadata takes priority, then participants, then subject
  const merged = { ...fromSubject, ...fromParticipants, ...fromMeta };

  // Must have at least a name
  if (!merged.name) return null;

  return {
    name: merged.name,
    email: merged.email || undefined,
    linkedin_url: merged.linkedin_url || undefined,
    company: merged.company || undefined,
    role: merged.role || undefined,
    phone: merged.phone || undefined,
  };
}

/** Produce a dedup key: linkedin_url if available, else lowercase "name::company" */
function dedupKey(contact: ExtractedContact): string {
  if (contact.linkedin_url) return contact.linkedin_url.toLowerCase();
  return `${contact.name.toLowerCase()}::${(contact.company || "").toLowerCase()}`;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function findOrphanedConversations(): Promise<OrphanedConversation[]> {
  console.log("Querying orphaned conversations...");

  // Step 1: Find conversations whose contact_id references non-existent contacts
  // We do this by left-joining and checking, but Supabase JS doesn't support
  // raw left-join filtering well. Instead, get all conversations with a contact_id,
  // then check which contact_ids don't exist.

  const allConversations: OrphanedConversation[] = [];
  let offset = 0;
  const PAGE = 1000;

  // Fetch all conversations that have a contact_id set
  while (true) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, user_id, project_id, contact_id, subject, summary, metadata, participants")
      .not("contact_id", "is", null)
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("Error fetching conversations:", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allConversations.push(...(data as OrphanedConversation[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  console.log(`  Found ${allConversations.length} conversations with contact_id set`);

  if (allConversations.length === 0) return [];

  // Collect unique contact_ids
  const contactIds = [...new Set(allConversations.map((c) => c.contact_id!))];

  // Check which contact_ids actually exist
  const existingIds = new Set<string>();
  for (let i = 0; i < contactIds.length; i += PAGE) {
    const batch = contactIds.slice(i, i + PAGE);
    const { data } = await supabase
      .from("contacts")
      .select("id")
      .in("id", batch);
    if (data) {
      for (const row of data) existingIds.add(row.id);
    }
  }

  // Orphans = conversations whose contact_id is NOT in existing contacts
  const orphaned = allConversations.filter(
    (c) => c.contact_id && !existingIds.has(c.contact_id),
  );

  console.log(`  ${orphaned.length} conversations reference non-existent contacts`);

  // Step 2: Also find conversations with NULL contact_id that have metadata
  offset = 0;
  const nullContactConvs: OrphanedConversation[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, user_id, project_id, contact_id, subject, summary, metadata, participants")
      .is("contact_id", null)
      .neq("metadata", "{}")
      .range(offset, offset + PAGE - 1);

    if (error) {
      console.error("Error fetching null-contact conversations:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    nullContactConvs.push(...(data as OrphanedConversation[]));
    if (data.length < PAGE) break;
    offset += PAGE;
  }

  // Filter to only those with extractable contact info
  const extractableNulls = nullContactConvs.filter(
    (c) => extractContact(c) !== null,
  );

  console.log(
    `  ${extractableNulls.length} conversations with NULL contact_id have extractable metadata`,
  );

  return [...orphaned, ...extractableNulls];
}

function groupByContact(
  conversations: OrphanedConversation[],
): Map<string, ContactKey> {
  const map = new Map<string, ContactKey>();

  for (const conv of conversations) {
    const contact = extractContact(conv);
    if (!contact) continue;

    const key = dedupKey(contact);
    const existing = map.get(key);

    if (existing) {
      existing.conversation_ids.push(conv.id);
      // Merge in any additional info from this conversation
      if (!existing.contact.email && contact.email)
        existing.contact.email = contact.email;
      if (!existing.contact.linkedin_url && contact.linkedin_url)
        existing.contact.linkedin_url = contact.linkedin_url;
      if (!existing.contact.company && contact.company)
        existing.contact.company = contact.company;
      if (!existing.contact.role && contact.role)
        existing.contact.role = contact.role;
      if (!existing.contact.phone && contact.phone)
        existing.contact.phone = contact.phone;
    } else {
      map.set(key, {
        key,
        contact,
        user_id: conv.user_id,
        project_id: conv.project_id,
        conversation_ids: [conv.id],
      });
    }
  }

  return map;
}

async function recoverContacts(
  contactGroups: Map<string, ContactKey>,
): Promise<{
  contactsCreated: number;
  conversationsRelinked: number;
  skipped: number;
  failures: number;
}> {
  let contactsCreated = 0;
  let conversationsRelinked = 0;
  let skipped = 0;
  let failures = 0;

  const entries = [...contactGroups.values()];

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(entries.length / BATCH_SIZE);

    console.log(
      `\nProcessing batch ${batchNum}/${totalBatches} (${batch.length} contacts)...`,
    );

    for (const entry of batch) {
      const { contact, user_id, project_id, conversation_ids } = entry;

      // Check if contact already exists by linkedin_url or email
      let existingContactId: string | null = null;

      if (contact.linkedin_url) {
        const { data } = await supabase
          .from("contacts")
          .select("id")
          .eq("linkedin_url", contact.linkedin_url)
          .maybeSingle();
        if (data) existingContactId = data.id;
      }

      if (!existingContactId && contact.email) {
        const { data } = await supabase
          .from("contacts")
          .select("id")
          .eq("email", contact.email)
          .maybeSingle();
        if (data) existingContactId = data.id;
      }

      if (existingContactId) {
        // Contact exists — just re-link conversations
        console.log(
          `  [LINK] "${contact.name}" already exists (${existingContactId}), ` +
            `linking ${conversation_ids.length} conversation(s)`,
        );

        if (!DRY_RUN) {
          const { error } = await supabase
            .from("conversations")
            .update({ contact_id: existingContactId })
            .in("id", conversation_ids);

          if (error) {
            console.error(`    FAILED to re-link: ${error.message}`);
            failures += conversation_ids.length;
            continue;
          }
        }

        conversationsRelinked += conversation_ids.length;
        continue;
      }

      // Create new contact
      const newContact = {
        name: contact.name,
        email: contact.email || null,
        linkedin_url: contact.linkedin_url || null,
        company: contact.company || null,
        role: contact.role || null,
        phone: contact.phone || null,
        source: "linkedin" as const,
        status: "lead" as const,
        user_id,
        project_id,
        tags: ["n8n-recovery"],
      };

      console.log(
        `  [CREATE] "${contact.name}"` +
          (contact.linkedin_url ? ` (${contact.linkedin_url})` : "") +
          (contact.company ? ` @ ${contact.company}` : "") +
          ` → ${conversation_ids.length} conversation(s)`,
      );

      if (DRY_RUN) {
        contactsCreated++;
        conversationsRelinked += conversation_ids.length;
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("contacts")
        .insert(newContact)
        .select("id")
        .single();

      if (insertError) {
        console.error(
          `    FAILED to create contact "${contact.name}": ${insertError.message}`,
        );
        failures++;
        skipped += conversation_ids.length;
        continue;
      }

      contactsCreated++;

      // Re-link conversations
      const { error: linkError } = await supabase
        .from("conversations")
        .update({ contact_id: inserted.id })
        .in("id", conversation_ids);

      if (linkError) {
        console.error(
          `    FAILED to re-link conversations for "${contact.name}": ${linkError.message}`,
        );
        failures += conversation_ids.length;
      } else {
        conversationsRelinked += conversation_ids.length;
      }
    }
  }

  return { contactsCreated, conversationsRelinked, skipped, failures };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(60));
  console.log("  Orphaned Conversation Recovery Script");
  console.log(`  Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "EXECUTE (live writes)"}`);
  console.log("=".repeat(60));
  console.log();

  // 1. Find orphaned conversations
  const orphaned = await findOrphanedConversations();

  if (orphaned.length === 0) {
    console.log("\nNo orphaned conversations found. Nothing to do.");
    return;
  }

  // 2. Group by unique contact
  const contactGroups = groupByContact(orphaned);

  const extractable = [...contactGroups.values()].reduce(
    (sum, g) => sum + g.conversation_ids.length,
    0,
  );
  const noContact = orphaned.length - extractable;

  console.log(
    `\nGrouped into ${contactGroups.size} unique contacts ` +
      `covering ${extractable} conversations ` +
      `(${noContact} conversations had no extractable contact info)`,
  );

  // 3. Create contacts and re-link
  const result = await recoverContacts(contactGroups);

  // 4. Summary
  console.log("\n" + "=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`  Mode:                   ${DRY_RUN ? "DRY RUN" : "EXECUTED"}`);
  console.log(`  Orphaned conversations: ${orphaned.length}`);
  console.log(`  Contacts created:       ${result.contactsCreated}`);
  console.log(`  Conversations re-linked:${result.conversationsRelinked}`);
  console.log(`  Skipped (no contact):   ${noContact + result.skipped}`);
  console.log(`  Failures:               ${result.failures}`);
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log(
      "\nThis was a dry run. Pass --execute to apply changes.",
    );
  }
}

main().catch((err) => {
  console.error("Recovery failed:", err);
  process.exit(1);
});
