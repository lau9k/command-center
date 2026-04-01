"use server";

import { createServiceClient } from "@/lib/supabase/service";
import {
  createContact as createContactDb,
  updateContact as updateContactDb,
  deleteContact as deleteContactDb,
} from "@/lib/api/contacts";
import type { CreateContactInput } from "@/lib/api/contacts";
import type { Contact } from "@/lib/types/database";

export async function updateContactStatus(
  id: string,
  qualified_status: string
): Promise<Contact> {
  const supabase = createServiceClient();
  return updateContactDb(supabase, id, { qualified_status });
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createServiceClient();
  return deleteContactDb(supabase, id);
}

export async function createContact(
  data: CreateContactInput
): Promise<Contact> {
  const supabase = createServiceClient();
  return createContactDb(supabase, data);
}
