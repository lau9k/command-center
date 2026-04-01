"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import {
  createContact as createContactDb,
  updateContact as updateContactDb,
  deleteContact as deleteContactDb,
  mergeContacts as mergeContactsDb,
} from "@/lib/api/contacts";
import type { CreateContactInput, UpdateContactInput } from "@/lib/api/contacts";
import type { Contact } from "@/lib/types/database";
import { createContactSchema, updateContactSchema } from "@/lib/validations";
import { syncToPersonize } from "@/lib/personize/sync";

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

// ── Mutation Actions (structured returns) ────────────────

export async function createContactAction(
  data: CreateContactInput
): Promise<{ success: boolean; data?: Contact; error?: string }> {
  const parsed = createContactSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = createServiceClient();
    const contact = await createContactDb(supabase, parsed.data);

    syncToPersonize({
      table: "contacts",
      recordId: contact.id,
      content: JSON.stringify(contact),
      email: contact.email ?? undefined,
    }).catch((err) => {
      console.error("[actions] createContactAction sync error:", err);
    });

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true, data: contact };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create contact" };
  }
}

export async function updateContactAction(
  id: string,
  data: UpdateContactInput
): Promise<{ success: boolean; data?: Contact; error?: string }> {
  const parsed = updateContactSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const supabase = createServiceClient();
    const contact = await updateContactDb(supabase, id, parsed.data);

    syncToPersonize({
      table: "contacts",
      recordId: contact.id,
      content: JSON.stringify(contact),
      email: contact.email ?? undefined,
    }).catch((err) => {
      console.error("[actions] updateContactAction sync error:", err);
    });

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true, data: contact };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update contact" };
  }
}

export async function deleteContactAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceClient();
    await deleteContactDb(supabase, id);

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete contact" };
  }
}

export async function mergeContactsAction(
  primaryId: string,
  duplicateId: string
): Promise<{ success: boolean; data?: Contact; error?: string }> {
  try {
    const supabase = createServiceClient();
    const contact = await mergeContactsDb(supabase, primaryId, duplicateId);

    revalidatePath("/contacts");
    revalidatePath("/");

    return { success: true, data: contact };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to merge contacts" };
  }
}
