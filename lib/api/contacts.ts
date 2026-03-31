import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { Contact } from "@/lib/types/database";

// ── Read ─────────────────────────────────────────────────

export async function getContactById(id: string): Promise<Contact | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
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

export interface GetContactsOptions {
  search?: string;
  qualified_status?: string;
}

export async function getContacts(
  filters?: GetContactsOptions
): Promise<Contact[]> {
  const supabase = createServiceClient();

  let query = supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company.ilike.%${filters.search}%`
    );
  }
  if (filters?.qualified_status) {
    query = query.eq("qualified_status", filters.qualified_status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data ?? []) as Contact[];
}

// ── Write ────────────────────────────────────────────────

export interface CreateContactInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  source?: string | null;
  qualified_status?: string | null;
  tags?: string[];
  score?: number;
  linkedin_url?: string | null;
  notes?: string | null;
  project_id?: string | null;
}

export async function createContact(
  input: CreateContactInput
): Promise<Contact> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("contacts")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;

  return data as Contact;
}

export interface UpdateContactInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  source?: string | null;
  qualified_status?: string | null;
  tags?: string[];
  score?: number;
  linkedin_url?: string | null;
  notes?: string | null;
  last_contact_date?: string | null;
  project_id?: string | null;
}

export async function updateContact(
  id: string,
  input: UpdateContactInput
): Promise<Contact> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("contacts")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return data as Contact;
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.from("contacts").delete().eq("id", id);

  if (error) throw error;
}
