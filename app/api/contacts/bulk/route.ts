import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { validateApiKey } from "@/lib/api-auth";
import { withErrorHandler } from "@/lib/api-error-handler";

const MAX_CONTACTS = 200;

const bulkContactInputSchema = z.object({
  name: z.string().min(1).max(500),
  company: z.string().max(500).optional().nullable(),
  email: z.string().email().max(500).optional().nullable(),
  linkedin_url: z.string().max(2000).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  qualified_status: z.string().max(100).optional().nullable(),
  next_action: z.string().max(500).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const bulkContactsRequestSchema = z.object({
  contacts: z
    .array(bulkContactInputSchema)
    .min(1, "At least one contact is required")
    .max(MAX_CONTACTS, `Maximum ${MAX_CONTACTS} contacts per request`),
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized — missing or invalid API key" },
      { status: 401 },
    );
  }

  const body: unknown = await request.json();

  const parsed = bulkContactsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const validContacts: z.infer<typeof bulkContactInputSchema>[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < parsed.data.contacts.length; i++) {
    const contactResult = bulkContactInputSchema.safeParse(
      parsed.data.contacts[i],
    );
    if (contactResult.success) {
      validContacts.push(contactResult.data);
    } else {
      const fieldErrors = contactResult.error.flatten().fieldErrors;
      errors.push({
        index: i,
        error: Object.entries(fieldErrors)
          .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(", ")}`)
          .join("; "),
      });
    }
  }

  let created = 0;
  let updated = 0;

  if (validContacts.length > 0) {
    const supabase = createServiceClient();

    // Separate contacts with linkedin_url (for upsert) from those without
    const withLinkedin = validContacts.filter((c) => c.linkedin_url);
    const withoutLinkedin = validContacts.filter((c) => !c.linkedin_url);

    // Upsert contacts that have a linkedin_url (conflict on linkedin_url)
    if (withLinkedin.length > 0) {
      // Get existing linkedin_urls to determine created vs updated count
      const urls = withLinkedin.map((c) => c.linkedin_url as string);
      const { data: existing } = await supabase
        .from("contacts")
        .select("linkedin_url")
        .in("linkedin_url", urls);

      const existingUrls = new Set(
        (existing ?? []).map((e) => e.linkedin_url as string),
      );

      const { data, error } = await supabase
        .from("contacts")
        .upsert(withLinkedin, { onConflict: "linkedin_url" })
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const upsertedCount = data?.length ?? 0;
      const updatedCount = withLinkedin.filter((c) =>
        existingUrls.has(c.linkedin_url as string),
      ).length;
      updated += updatedCount;
      created += upsertedCount - updatedCount;
    }

    // Insert contacts without linkedin_url (no upsert key)
    if (withoutLinkedin.length > 0) {
      const { data, error } = await supabase
        .from("contacts")
        .insert(withoutLinkedin)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      created += data?.length ?? 0;
    }
  }

  return NextResponse.json({ created, updated, errors }, { status: 201 });
});
