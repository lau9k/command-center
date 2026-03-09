import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type Module = "contacts" | "content" | "tasks" | "pipeline";

interface ImportBody {
  module: Module;
  rows: Record<string, string | null>[];
  project_id: string;
  user_id: string;
}

interface RowResult {
  row: number;
  status: "imported" | "updated" | "skipped";
  reason?: string;
}

// ---------------------------------------------------------------------------
// Module-specific configs
// ---------------------------------------------------------------------------

function getUniqueKey(module: Module): string | null {
  switch (module) {
    case "contacts":
      return "email";
    case "content":
      return "title";
    case "tasks":
      return "title";
    case "pipeline":
      return "title";
  }
}

function getRequiredField(module: Module): string {
  switch (module) {
    case "contacts":
      return "name";
    case "content":
      return "title";
    case "tasks":
      return "title";
    case "pipeline":
      return "title";
  }
}

function getTable(module: Module): string {
  switch (module) {
    case "contacts":
      return "contacts";
    case "content":
      return "content_posts";
    case "tasks":
      return "tasks";
    case "pipeline":
      return "pipeline_items";
  }
}

// ---------------------------------------------------------------------------
// Build insert record per module
// ---------------------------------------------------------------------------

function buildContactRecord(
  row: Record<string, string | null>,
  projectId: string,
  userId: string
) {
  const metadata: Record<string, unknown> = {};
  if (row.job_title) metadata.title = row.job_title;
  if (row.industry) metadata.industry = row.industry;
  if (row.city) metadata.city = row.city;
  if (row.country) metadata.country = row.country;
  if (row.phone) metadata.phone = row.phone;
  if (row.website) metadata.website = row.website;

  // Build name from first_name + last_name if name not directly mapped
  let name = row.name?.trim() || null;
  if (!name && (row.first_name || row.last_name)) {
    name = [row.first_name?.trim(), row.last_name?.trim()]
      .filter(Boolean)
      .join(" ");
  }

  return {
    project_id: projectId,
    user_id: userId,
    name: name || "",
    email: row.email?.trim()?.toLowerCase() || null,
    company: row.company_name?.trim() || row.company?.trim() || null,
    linkedin_url: row.linkedin_url?.trim() || null,
    source: row.source?.trim()?.toLowerCase() || "csv_import",
    metadata,
  };
}

function buildContentRecord(
  row: Record<string, string | null>,
  projectId: string,
  userId: string
) {
  const metadata: Record<string, unknown> = {};
  if (row.content_type) metadata.content_type = row.content_type;
  if (row.tone) metadata.tone = row.tone;

  return {
    project_id: projectId,
    user_id: userId,
    title: row.title?.trim() || "",
    caption: row.caption?.trim() || row.body?.trim() || null,
    platform: row.platform?.trim()?.toLowerCase() || null,
    status: row.status?.trim()?.toLowerCase() || "draft",
    scheduled_at: parseDate(row.scheduled_at || row.week_of),
    metadata,
  };
}

function buildTaskRecord(
  row: Record<string, string | null>,
  projectId: string,
  userId: string
) {
  return {
    project_id: projectId,
    user_id: userId,
    title: row.title?.trim() || "",
    description: row.description?.trim() || null,
    status: row.status?.trim()?.toLowerCase() || "todo",
    priority: row.priority?.trim()?.toLowerCase() || "medium",
    due_date: parseDate(row.due_date),
    assignee: row.assignee?.trim() || null,
  };
}

function buildPipelineRecord(
  row: Record<string, string | null>,
  projectId: string,
  userId: string
) {
  const metadata: Record<string, unknown> = {};
  if (row.company) metadata.company = row.company;
  if (row.value) metadata.deal_value = row.value;
  if (row.notes) metadata.notes = row.notes;
  if (row.probability) metadata.probability = row.probability;

  return {
    project_id: projectId,
    user_id: userId,
    title: row.title?.trim() || "",
    entity_type: "deal",
    metadata,
  };
}

function parseDate(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function buildRecord(
  module: Module,
  row: Record<string, string | null>,
  projectId: string,
  userId: string
) {
  switch (module) {
    case "contacts":
      return buildContactRecord(row, projectId, userId);
    case "content":
      return buildContentRecord(row, projectId, userId);
    case "tasks":
      return buildTaskRecord(row, projectId, userId);
    case "pipeline":
      return buildPipelineRecord(row, projectId, userId);
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportBody;

    if (!body.module || !["contacts", "content", "tasks", "pipeline"].includes(body.module)) {
      return NextResponse.json(
        { error: "module must be one of: contacts, content, tasks, pipeline" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json(
        { error: "non-empty rows array is required" },
        { status: 400 }
      );
    }

    if (!body.project_id || !body.user_id) {
      return NextResponse.json(
        { error: "project_id and user_id are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const table = getTable(body.module);
    const uniqueKey = getUniqueKey(body.module);
    const requiredField = getRequiredField(body.module);

    // Step 1: Check existing rows to detect duplicates
    // Only query if there's a unique key to check
    const existingValues = new Set<string>();

    if (uniqueKey) {
      // Get count first to see if table has rows for this project
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("project_id", body.project_id);

      if (count && count > 0) {
        // Table has rows — fetch existing unique key values for duplicate detection
        const { data: existingRows } = await supabase
          .from(table)
          .select(uniqueKey)
          .eq("project_id", body.project_id);

        if (existingRows) {
          for (const row of existingRows) {
            const val = (row as unknown as Record<string, unknown>)[uniqueKey];
            if (typeof val === "string" && val.trim()) {
              existingValues.add(val.trim().toLowerCase());
            }
          }
        }
      }
      // If count is 0, existingValues stays empty → skip duplicate detection → INSERT all
    }

    // Step 2: Process rows
    const results: RowResult[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];

      // Check required field
      // For contacts, name can be built from first_name + last_name
      let hasRequired = false;
      if (body.module === "contacts") {
        const name = row.name?.trim() || "";
        const firstName = row.first_name?.trim() || "";
        const lastName = row.last_name?.trim() || "";
        hasRequired = !!(name || firstName || lastName);
      } else {
        hasRequired = !!row[requiredField]?.trim();
      }

      if (!hasRequired) {
        results.push({
          row: i + 1,
          status: "skipped",
          reason: `Missing required field: ${requiredField}`,
        });
        skipped++;
        continue;
      }

      // Check if row is completely empty (all values null/empty)
      const hasAnyValue = Object.values(row).some((v) => v?.trim());
      if (!hasAnyValue) {
        results.push({
          row: i + 1,
          status: "skipped",
          reason: "Empty row",
        });
        skipped++;
        continue;
      }

      // Build the record
      const record = buildRecord(body.module, row, body.project_id, body.user_id);

      // Check for duplicate
      const uniqueVal = uniqueKey
        ? (row[uniqueKey]?.trim()?.toLowerCase() || null)
        : null;

      if (uniqueKey && uniqueVal && existingValues.has(uniqueVal)) {
        // Duplicate found — update existing record
        if (body.module === "contacts" && uniqueKey === "email") {
          const { error } = await supabase
            .from(table)
            .update(record)
            .eq("project_id", body.project_id)
            .eq("email", uniqueVal);

          if (error) {
            results.push({
              row: i + 1,
              status: "skipped",
              reason: `Update failed: ${error.message}`,
            });
            skipped++;
            continue;
          }
          results.push({ row: i + 1, status: "updated" });
          updated++;
        } else {
          // For content/tasks/pipeline, skip duplicates by title
          results.push({
            row: i + 1,
            status: "skipped",
            reason: `Duplicate ${uniqueKey}: ${uniqueVal}`,
          });
          skipped++;
        }
        continue;
      }

      // Insert new record
      try {
        const { error } = await supabase.from(table).insert(record);

        if (error) {
          results.push({
            row: i + 1,
            status: "skipped",
            reason: `Insert failed: ${error.message}`,
          });
          skipped++;
          continue;
        }

        // Track the new value to prevent duplicates within the same batch
        if (uniqueKey && uniqueVal) {
          existingValues.add(uniqueVal);
        }

        results.push({ row: i + 1, status: "imported" });
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.push({ row: i + 1, status: "skipped", reason: msg });
        skipped++;
      }
    }

    return NextResponse.json({
      imported,
      updated,
      skipped,
      total: body.rows.length,
      results,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
