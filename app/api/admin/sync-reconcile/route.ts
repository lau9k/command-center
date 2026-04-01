import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import {
  SYNCABLE_TABLES,
  isSyncableTable,
  bulkSyncToPersonize,
} from "@/lib/personize/sync";
import type { SyncableTable } from "@/lib/personize/sync";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRY_RECORDS = 50;
const RECORDS_PER_STATUS_PER_TABLE = 100;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const retryRecordSchema = z.object({
  table: z.string().refine(isSyncableTable, {
    message: `Table must be one of: ${SYNCABLE_TABLES.join(", ")}`,
  }),
  id: z.string().uuid(),
});

const retryRequestSchema = z.object({
  records: z
    .array(retryRecordSchema)
    .min(1, "At least one record is required")
    .max(MAX_RETRY_RECORDS, `Maximum ${MAX_RETRY_RECORDS} records per request`),
});

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function authorize(req: NextRequest): NextResponse | null {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET env var is not configured" },
      { status: 500 }
    );
  }

  const provided =
    req.headers.get("x-seed-secret") ??
    req.nextUrl.searchParams.get("secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FailedRecord {
  table: string;
  id: string;
  status: "failed" | "pending";
  last_error?: string;
}

// ---------------------------------------------------------------------------
// GET /api/admin/sync-reconcile
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(async function GET(req: NextRequest) {
  const authError = authorize(req);
  if (authError) return authError;

  const supabase = createServiceClient();

  const failed: FailedRecord[] = [];
  const pending: FailedRecord[] = [];

  for (const table of SYNCABLE_TABLES) {
    // Fetch failed records
    const { data: failedRows } = await supabase
      .from(table)
      .select("id, personize_sync_status")
      .eq("personize_sync_status", "failed")
      .limit(RECORDS_PER_STATUS_PER_TABLE);

    if (failedRows) {
      for (const row of failedRows) {
        const record = row as { id: string; personize_sync_status: string };
        failed.push({
          table,
          id: record.id,
          status: "failed",
        });
      }
    }

    // Fetch pending records
    const { data: pendingRows } = await supabase
      .from(table)
      .select("id, personize_sync_status")
      .eq("personize_sync_status", "pending")
      .limit(RECORDS_PER_STATUS_PER_TABLE);

    if (pendingRows) {
      for (const row of pendingRows) {
        const record = row as { id: string; personize_sync_status: string };
        pending.push({
          table,
          id: record.id,
          status: "pending",
        });
      }
    }
  }

  return NextResponse.json({ failed, pending });
});

// ---------------------------------------------------------------------------
// POST /api/admin/sync-reconcile
// ---------------------------------------------------------------------------

export const POST = withErrorHandler(async function POST(req: NextRequest) {
  const authError = authorize(req);
  if (authError) return authError;

  const body: unknown = await req.json();
  const parsed = retryRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { records } = parsed.data;
  const supabase = createServiceClient();

  // Set all records to 'pending' before retrying
  for (const { table, id } of records) {
    await supabase
      .from(table as SyncableTable)
      .update({ personize_sync_status: "pending" })
      .eq("id", id);
  }

  // Retry sync with rate limiting
  const result = await bulkSyncToPersonize(
    records.map((r) => ({ table: r.table as SyncableTable, id: r.id }))
  );

  return NextResponse.json(result);
});
