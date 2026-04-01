import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contact } from "@/lib/types/database";

// ── Types ─────────────────────────────────────────────────

export interface ContactFilters {
  status?: string;
  qualified_status?: string;
  company?: string;
  tag?: string;
  search?: string;
  contactSource?: string;
}

export interface CreateContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  source?: string | null;
  qualified_status?: string | null;
  tags?: string[] | null;
  score?: number | null;
  linkedin_url?: string | null;
  notes?: string | null;
  project_id?: string | null;
  checked_in_at?: string | null;
}

export interface UpdateContactInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  source?: string | null;
  qualified_status?: string | null;
  tags?: string[] | null;
  score?: number | null;
  linkedin_url?: string | null;
  notes?: string | null;
  last_contact_date?: string | null;
  project_id?: string | null;
  checked_in_at?: string | null;
}

// ── Read ──────────────────────────────────────────────────

export async function getContact(
  client: SupabaseClient,
  id: string
): Promise<Contact | null> {
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw error;
  }

  return data as Contact;
}

export async function getContacts(
  client: SupabaseClient,
  filters?: ContactFilters
): Promise<Contact[]> {
  let query = client
    .from("contacts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
    );
  }
  if (filters?.qualified_status) {
    query = query.eq("qualified_status", filters.qualified_status);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.tag) {
    query = query.contains("tags", [filters.tag]);
  }
  if (filters?.contactSource) {
    query = query.eq("source", filters.contactSource);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as Contact[];
}

// ── Write ─────────────────────────────────────────────────

export async function createContact(
  client: SupabaseClient,
  data: CreateContactInput
): Promise<Contact> {
  const { data: row, error } = await client
    .from("contacts")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;

  return row as Contact;
}

export async function updateContact(
  client: SupabaseClient,
  id: string,
  data: UpdateContactInput
): Promise<Contact> {
  const { data: row, error } = await client
    .from("contacts")
    .update(data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return row as Contact;
}

export async function deleteContact(
  client: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await client.from("contacts").delete().eq("id", id);

  if (error) throw error;
}

// ── Search ────────────────────────────────────────────────

export async function searchContacts(
  client: SupabaseClient,
  query: string
): Promise<Contact[]> {
  const { data, error } = await client
    .from("contacts")
    .select("*")
    .or(
      `name.ilike.%${query}%,email.ilike.%${query}%,company.ilike.%${query}%,notes.ilike.%${query}%`
    )
    .order("score", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []) as Contact[];
}

// ── Follow-ups ────────────────────────────────────────────

export async function getContactFollowUps(
  client: SupabaseClient
): Promise<Contact[]> {
  const { data, error } = await client
    .from("contacts")
    .select("id, name, email, company, score, status, last_contact_date")
    .is("merged_into_id", null)
    .in("status", ["active", "lead", "customer"])
    .order("last_contact_date", { ascending: true, nullsFirst: true });

  if (error) throw error;

  return (data ?? []) as Contact[];
}

// ── Merge ─────────────────────────────────────────────────

export interface MergeFieldOverrides {
  [key: string]: string | number | string[] | null;
}

export async function mergeContacts(
  client: SupabaseClient,
  primaryId: string,
  duplicateId: string,
  fieldOverrides?: MergeFieldOverrides
): Promise<Contact> {
  // Fetch both contacts
  const [primaryRes, duplicateRes] = await Promise.all([
    client.from("contacts").select("*").eq("id", primaryId).single(),
    client.from("contacts").select("*").eq("id", duplicateId).single(),
  ]);

  if (primaryRes.error || !primaryRes.data) {
    throw new Error("Primary contact not found");
  }
  if (duplicateRes.error || !duplicateRes.data) {
    throw new Error("Duplicate contact not found");
  }

  const primary = primaryRes.data;
  const duplicate = duplicateRes.data;

  // Build update payload
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Merge tags (union, deduplicate)
  updatePayload.tags = Array.from(
    new Set([...(primary.tags ?? []), ...(duplicate.tags ?? [])])
  );

  // Merge notes
  if (duplicate.notes && duplicate.notes.trim()) {
    const primaryNotes = primary.notes ?? "";
    updatePayload.notes = primaryNotes
      ? `${primaryNotes}\n\n--- Merged from ${duplicate.name} ---\n\n${duplicate.notes}`
      : duplicate.notes;
  }

  // Take higher score
  if ((duplicate.score ?? 0) > (primary.score ?? 0)) {
    updatePayload.score = duplicate.score;
  }

  // Fill in missing fields from duplicate
  const fillableFields = ["email", "phone", "company", "role", "last_contact_date"] as const;
  for (const field of fillableFields) {
    if (!primary[field] && duplicate[field]) {
      updatePayload[field] = duplicate[field];
    }
  }

  // Apply explicit field overrides
  if (fieldOverrides) {
    for (const [key, value] of Object.entries(fieldOverrides)) {
      updatePayload[key] = value;
    }
  }

  // 1. Update primary with merged data
  const { error: updateError } = await client
    .from("contacts")
    .update(updatePayload)
    .eq("id", primaryId);

  if (updateError) {
    throw new Error(`Failed to update primary contact: ${updateError.message}`);
  }

  // 2. Reassign conversations FK
  const { error: convError } = await client
    .from("conversations")
    .update({ contact_id: primaryId })
    .eq("contact_id", duplicateId);

  if (convError) {
    // Non-fatal — log but continue
    console.error("[mergeContacts] Failed to reassign conversations:", convError.message);
  }

  // 3. Mark the duplicate as merged
  const { error: mergeMarkError } = await client
    .from("contacts")
    .update({ merged_into_id: primaryId })
    .eq("id", duplicateId);

  if (mergeMarkError) {
    throw new Error(`Failed to mark duplicate as merged: ${mergeMarkError.message}`);
  }

  // Fetch and return updated primary
  const { data: updatedPrimary, error: fetchError } = await client
    .from("contacts")
    .select("*")
    .eq("id", primaryId)
    .single();

  if (fetchError || !updatedPrimary) {
    throw new Error("Failed to fetch updated primary contact");
  }

  return updatedPrimary as Contact;
}
