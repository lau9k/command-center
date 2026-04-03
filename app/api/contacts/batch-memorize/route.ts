import { NextRequest, NextResponse } from "next/server";
import { batchMemorizeSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import {
  batchMemorize,
  type BatchContact,
} from "@/lib/personize/batch-memorize";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  const parsed = batchMemorizeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { source, rows } = parsed.data;

  // Map incoming rows to BatchContact format
  const contacts: BatchContact[] = rows.map((row) => ({
    email: row.email ?? null,
    name: row.name ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    job_title: row.job_title ?? row.title ?? null,
    company_name: row.company_name ?? row.company ?? null,
    linkedin_url: row.linkedin_url ?? null,
    website: row.website ?? null,
    phone: row.phone ?? null,
    industry: row.industry ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    source: row.source ?? source,
  }));

  try {
    const result = await batchMemorize(contacts, source);

    return NextResponse.json(
      {
        success: true,
        accepted: result.succeeded,
        failed: result.failed,
        total: result.total,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[API] POST /api/contacts/batch-memorize error:", error);
    const message =
      error instanceof Error ? error.message : "Personize API error";
    return NextResponse.json(
      { error: "Upstream service error", message },
      { status: 502 }
    );
  }
});
