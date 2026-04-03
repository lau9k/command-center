import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";
import { batchMemorize, type BatchContact } from "@/lib/personize/batch-memorize";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";
// Allow long-running batch calls (up to 5 minutes)
export const maxDuration = 300;

const personizeImportSchema = z.object({
  import_id: z.string().uuid("import_id must be a valid UUID"),
});

export const POST = withAuth(async function POST(request: NextRequest, _user) {
  let body: z.infer<typeof personizeImportSchema>;
  try {
    const raw = await request.json();
    const parsed = personizeImportSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
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

  const contacts = importRecord.mapped_data as BatchContact[];
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

  const result = await batchMemorize(contacts, filename, async (progress) => {
    // Update progress in Supabase for polling
    await supabase
      .from("imports")
      .update({
        processed_count: progress.processed,
        error_count: progress.failed,
      })
      .eq("id", body.import_id);
  });

  // Build per-contact error details for compatibility with existing UI
  const errorDetails: { index: number; email: string | null; error: string }[] = [];
  for (const batchErr of result.errors) {
    for (const idx of batchErr.contactIndices) {
      const contact = contacts[idx];
      errorDetails.push({
        index: idx,
        email: contact?.email ?? null,
        error: batchErr.error,
      });
    }
  }

  // Set final status
  const finalStatus = result.succeeded === 0 && result.total > 0 ? "failed" : "complete";
  await supabase
    .from("imports")
    .update({
      status: finalStatus,
      processed_count: result.total,
      error_count: result.failed,
      error_details: errorDetails,
    })
    .eq("id", body.import_id);

  return NextResponse.json({
    imported: result.succeeded,
    errors: result.failed,
    details: errorDetails,
  });
});
