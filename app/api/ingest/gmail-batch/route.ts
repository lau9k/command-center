import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  processGmailBatch,
  logBatchToSyncLog,
  type GmailMessage,
} from "@/lib/gmail-ingest";
import { timingSafeEqual } from "crypto";

function validateIngestKey(request: NextRequest): NextResponse | null {
  const secret = process.env.INGEST_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "Ingest webhook secret not configured" },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-ingest-key");
  if (!provided) {
    return NextResponse.json(
      { success: false, error: "Missing x-ingest-key header" },
      { status: 401 }
    );
  }

  const expected = Buffer.from(secret);
  const received = Buffer.from(provided);

  if (
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid ingest key" },
      { status: 401 }
    );
  }

  return null;
}

export const POST = withRateLimit(
  withErrorHandler(async function POST(request: NextRequest) {
    // 1. Auth
    const authError = validateIngestKey(request);
    if (authError) return authError;

    // 2. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      !("emails" in body) ||
      !Array.isArray((body as { emails: unknown }).emails)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must be { emails: GmailMessage[] }",
        },
        { status: 400 }
      );
    }

    const emails = (body as { emails: GmailMessage[] }).emails;

    if (emails.length === 0) {
      return NextResponse.json(
        { success: true, processed: 0, skipped: 0, errors: [] },
        { status: 200 }
      );
    }

    // 3. Process the batch
    const result = await processGmailBatch(emails);

    // 4. Log to sync_log
    await logBatchToSyncLog(emails.length, result);

    // 5. Return result
    const status = result.errors.length > 0 ? 207 : 200;
    return NextResponse.json(
      {
        success: result.errors.length === 0,
        processed: result.processed,
        skipped: result.skipped,
        errors: result.errors,
      },
      { status }
    );
  }),
  RATE_LIMITS.ingest
);
