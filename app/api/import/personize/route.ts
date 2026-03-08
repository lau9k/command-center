import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
// Allow long-running sequential calls (up to 5 minutes)
export const maxDuration = 300;

interface PersonizeRequestBody {
  import_id: string;
}

interface ContactRecord {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
  phone?: string | null;
  industry?: string | null;
  city?: string | null;
  country?: string | null;
}

function buildMemorizePayload(contact: ContactRecord, filename: string) {
  const lines = [
    `Contact: ${contact.first_name ?? ""} ${contact.last_name ?? ""}`.trim(),
    contact.email ? `Email: ${contact.email}` : null,
    contact.job_title ? `Title: ${contact.job_title}` : null,
    contact.company_name ? `Company: ${contact.company_name}` : null,
    contact.linkedin_url ? `LinkedIn: ${contact.linkedin_url}` : null,
    contact.website ? `Website: ${contact.website}` : null,
    contact.phone ? `Phone: ${contact.phone}` : null,
    contact.industry ? `Industry: ${contact.industry}` : null,
    contact.city || contact.country
      ? `Location: ${[contact.city, contact.country].filter(Boolean).join(", ")}`
      : null,
  ].filter(Boolean);

  return {
    content: lines.join("\n"),
    entity: { email: contact.email ?? "" },
    type: "Contact",
    tags: ["csv-import", filename],
    enhanced: true,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.PERSONIZE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "PERSONIZE_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: PersonizeRequestBody;
  try {
    body = (await request.json()) as PersonizeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.import_id) {
    return NextResponse.json(
      { error: "import_id is required" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Fetch the import record
  const { data: importRecord, error: fetchError } = await supabase
    .from("imports")
    .select("*")
    .eq("id", body.import_id)
    .single();

  if (fetchError || !importRecord) {
    return NextResponse.json(
      { error: "Import record not found" },
      { status: 404 }
    );
  }

  if (importRecord.status === "processing") {
    return NextResponse.json(
      { error: "This import is already being processed" },
      { status: 409 }
    );
  }

  const contacts = importRecord.mapped_data as ContactRecord[];
  const filename = importRecord.filename as string;

  // Set status to processing
  await supabase
    .from("imports")
    .update({
      status: "processing",
      processed_count: 0,
      error_count: 0,
      error_details: [],
    })
    .eq("id", body.import_id);

  let processed = 0;
  let errors = 0;
  const errorDetails: { index: number; email: string | null; error: string }[] = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const payload = buildMemorizePayload(contact, filename);

    try {
      const res = await fetch(
        "https://agent.personize.ai/api/v1/memory/memorize",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        errors++;
        errorDetails.push({
          index: i,
          email: contact.email ?? null,
          error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
        });
      } else {
        processed++;
      }
    } catch (err) {
      errors++;
      errorDetails.push({
        index: i,
        email: contact.email ?? null,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }

    // Update progress in Supabase after each contact
    await supabase
      .from("imports")
      .update({
        processed_count: processed + errors,
        error_count: errors,
        error_details: errorDetails,
      })
      .eq("id", body.import_id);

    // Rate limit: 1 request per second (skip delay after last contact)
    if (i < contacts.length - 1) {
      await delay(1000);
    }
  }

  // Set final status
  const finalStatus = errors === contacts.length ? "failed" : "complete";
  await supabase
    .from("imports")
    .update({
      status: finalStatus,
      processed_count: processed + errors,
      error_count: errors,
      error_details: errorDetails,
    })
    .eq("id", body.import_id);

  return NextResponse.json({
    imported: processed,
    errors,
    details: errorDetails,
  });
}
