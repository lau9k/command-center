"use server";

import {
  createContact as createContactInDb,
  updateContact,
  deleteContact as deleteContactById,
} from "@/lib/api/contacts";
import type { CreateContactInput } from "@/lib/api/contacts";
import type { Contact } from "@/lib/types/database";

export async function updateContactStatus(
  id: string,
  qualified_status: string
): Promise<Contact> {
  return updateContact(id, { qualified_status });
}

export async function deleteContact(id: string): Promise<void> {
  return deleteContactById(id);
}

export async function createContact(
  data: CreateContactInput
): Promise<Contact> {
  return createContactInDb(data);
}
