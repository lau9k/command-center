import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TableCount {
  table: string;
  count: number;
}

interface OrphanCheck {
  table: string;
  foreignKey: string;
  referencedTable: string;
  orphanedCount: number;
}

interface HealthCheckResult {
  status: "healthy" | "warning" | "error";
  tableCounts: TableCount[];
  orphanChecks: OrphanCheck[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Foreign key relationships to check
// ---------------------------------------------------------------------------

const FK_CHECKS: Array<{
  table: string;
  foreignKey: string;
  referencedTable: string;
}> = [
  { table: "tasks", foreignKey: "project_id", referencedTable: "projects" },
  { table: "contacts", foreignKey: "project_id", referencedTable: "projects" },
  { table: "pipeline_items", foreignKey: "pipeline_id", referencedTable: "pipelines" },
  { table: "pipeline_items", foreignKey: "stage_id", referencedTable: "pipeline_stages" },
  { table: "pipeline_stages", foreignKey: "pipeline_id", referencedTable: "pipelines" },
  { table: "pipelines", foreignKey: "project_id", referencedTable: "projects" },
  { table: "sponsors", foreignKey: "event_id", referencedTable: "events" },
  { table: "sponsor_outreach", foreignKey: "sponsor_id", referencedTable: "sponsors" },
];

const TABLES_TO_COUNT = [
  "projects",
  "contacts",
  "tasks",
  "pipelines",
  "pipeline_stages",
  "pipeline_items",
  "events",
  "sponsors",
  "sponsor_outreach",
];

// ---------------------------------------------------------------------------
// GET /api/admin/health
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(async function GET(req: NextRequest) {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SEED_SECRET env var is not configured" },
      { status: 500 },
    );
  }

  const provided =
    req.headers.get("x-seed-secret") ??
    req.nextUrl.searchParams.get("secret");

  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // ---- Table row counts ----
  const tableCounts: TableCount[] = [];

  for (const table of TABLES_TO_COUNT) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });

    tableCounts.push({
      table,
      count: error ? -1 : (count ?? 0),
    });
  }

  // ---- Orphan checks ----
  const orphanChecks: OrphanCheck[] = [];

  for (const fk of FK_CHECKS) {
    // Get all distinct foreign key values from the child table (non-null only)
    const { data: childRows, error: childErr } = await supabase
      .from(fk.table)
      .select(fk.foreignKey)
      .not(fk.foreignKey, "is", null);

    if (childErr || !childRows) {
      orphanChecks.push({
        ...fk,
        orphanedCount: -1,
      });
      continue;
    }

    // Collect unique FK values
    const fkValues = [
      ...new Set(
        childRows
          .map((row) => {
            const record = row as unknown as Record<string, string>;
            return record[fk.foreignKey];
          })
          .filter(Boolean),
      ),
    ];

    if (fkValues.length === 0) {
      orphanChecks.push({ ...fk, orphanedCount: 0 });
      continue;
    }

    // Check which parent IDs actually exist
    const { data: parentRows, error: parentErr } = await supabase
      .from(fk.referencedTable)
      .select("id")
      .in("id", fkValues);

    if (parentErr) {
      orphanChecks.push({ ...fk, orphanedCount: -1 });
      continue;
    }

    const parentIds = new Set((parentRows ?? []).map((r) => r.id));
    const orphanedCount = fkValues.filter((v) => !parentIds.has(v)).length;

    orphanChecks.push({ ...fk, orphanedCount });
  }

  // ---- Determine overall status ----
  const hasOrphans = orphanChecks.some((c) => c.orphanedCount > 0);
  const hasErrors = orphanChecks.some((c) => c.orphanedCount === -1) ||
    tableCounts.some((c) => c.count === -1);

  let status: HealthCheckResult["status"] = "healthy";
  if (hasErrors) status = "error";
  else if (hasOrphans) status = "warning";

  const result: HealthCheckResult = {
    status,
    tableCounts,
    orphanChecks,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(result);
});
