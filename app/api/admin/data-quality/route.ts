import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldCheck {
  field: string;
  missing: number;
}

interface TableMetrics {
  table: string;
  row_count: number;
  field_checks: FieldCheck[];
  completeness_pct: number;
  last_created_at: string | null;
}

// ---------------------------------------------------------------------------
// Config — tables and the fields to check for completeness
// ---------------------------------------------------------------------------

const TABLE_FIELD_CHECKS: Record<string, string[]> = {
  contacts: ["last_contact_date", "email", "company"],
  tasks: ["description", "due_date"],
  content_posts: ["body", "platform"],
  conversations: [],
  transactions: [],
  pipeline_items: [],
  meetings: [],
  notifications: [],
};

const CORE_TABLES = Object.keys(TABLE_FIELD_CHECKS);

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(
  withAuth(async function GET() {
    const supabase = createServiceClient();
    const results: TableMetrics[] = [];

    for (const table of CORE_TABLES) {
      // Row count
      const { count, error: countError } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      const rowCount = countError ? -1 : (count ?? 0);

      // Field completeness checks
      const fieldsToCheck = TABLE_FIELD_CHECKS[table];
      const fieldChecks: FieldCheck[] = [];

      for (const field of fieldsToCheck) {
        const { count: missingCount, error: fieldError } = await supabase
          .from(table)
          .select("*", { count: "exact", head: true })
          .is(field, null);

        fieldChecks.push({
          field,
          missing: fieldError ? -1 : (missingCount ?? 0),
        });
      }

      // Completeness percentage
      let completenessPct = 100;
      if (rowCount > 0 && fieldsToCheck.length > 0) {
        const totalSlots = rowCount * fieldsToCheck.length;
        const totalMissing = fieldChecks.reduce(
          (sum, fc) => sum + (fc.missing > 0 ? fc.missing : 0),
          0,
        );
        completenessPct = Math.round(((totalSlots - totalMissing) / totalSlots) * 100);
      }

      // Most recent created_at
      const { data: latestRow } = await supabase
        .from(table)
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      results.push({
        table,
        row_count: rowCount,
        field_checks: fieldChecks,
        completeness_pct: completenessPct,
        last_created_at: latestRow?.created_at ?? null,
      });
    }

    return NextResponse.json({ data: results });
  }),
);
