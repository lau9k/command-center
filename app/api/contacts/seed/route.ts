import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

const seedContactSchema = z.object({
  name: z.string().min(1).max(500),
  email: z.string().email().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  company: z.string().max(500).optional().nullable(),
  role: z.string().max(500).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(100)).optional().nullable(),
  score: z.number().int().min(0).max(100).optional().nullable(),
  source: z.string().max(200).optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

const seedRequestSchema = z.object({
  contacts: z.array(seedContactSchema).min(1).max(200),
  user_id: z.string().uuid().optional().nullable(),
});

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = seedRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { contacts, user_id } = parsed.data;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const contact of contacts) {
    const record = {
      ...contact,
      ...(user_id ? { user_id } : {}),
    };

    // Try to find existing contact by email
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
          console.error(`[seed] Failed to update contact ${contact.email}:`, error.message);
          skipped++;
        } else {
          updated++;
        }
        continue;
      }
    }

    // Insert new contact
    const { error } = await supabase.from("contacts").insert(record);

    if (error) {
      console.error(`[seed] Failed to insert contact ${contact.name}:`, error.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ inserted, updated, skipped });
});
