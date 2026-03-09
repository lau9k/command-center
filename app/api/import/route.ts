import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

type ImportModule = "contacts" | "tasks" | "content" | "pipeline";

interface ImportBody {
  module: ImportModule;
  mapped_data: Record<string, string | null>[];
  project_id: string | null;
  user_id: string;
}

interface RowResult {
  row: number;
  action: "imported" | "updated" | "skipped";
  reason?: string;
}

const REQUIRED_FIELDS: Record<ImportModule, string[]> = {
  contacts: ["name"],
  tasks: ["title"],
  content: ["title"],
  pipeline: ["title"],
};

const UNIQUE_KEY: Record<ImportModule, string | null> = {
  contacts: "email",
  tasks: "title",
  content: "title",
  pipeline: "title",
};

const TABLE_NAME: Record<ImportModule, string> = {
  contacts: "contacts",
  tasks: "tasks",
  content: "content_posts",
  pipeline: "pipeline_items",
};

function buildContactRow(
  row: Record<string, string | null>,
  projectId: string,
  userId: string
) {
  const data: Record<string, unknown> = {
    project_id: projectId,
    user_id: userId,
    name: row.name!.trim(),
  };
  if (row.email?.trim()) data.email = row.email.trim();
  if (row.company?.trim()) data.company = row.company.trim();
  if (row.source?.trim()) data.source = row.source.trim();
  if (row.linkedin_url?.trim()) data.linkedin_url = row.linkedin_url.trim();
  if (row.qualified_status?.trim())
    data.qualified_status = row.qualified_status.trim();
  if (row.next_action?.trim()) data.next_action = row.next_action.trim();
  return data;
}

function buildTaskRow(
  row: Record<string, string | null>,
  projectId: string | null,
  userId: string
) {
  const data: Record<string, unknown> = {
    user_id: userId,
    title: row.title!.trim(),
  };
  if (projectId) data.project_id = projectId;
  if (row.description?.trim()) data.description = row.description.trim();
  if (row.status?.trim()) {
    const s = row.status.trim().toLowerCase().replace(/\s+/g, "_");
    if (["todo", "in_progress", "done"].includes(s)) data.status = s;
  }
  if (row.priority?.trim()) {
    const p = row.priority.trim().toLowerCase();
    if (["critical", "high", "medium", "low"].includes(p)) data.priority = p;
  }
  if (row.due_date?.trim()) data.due_date = row.due_date.trim();
  if (row.assignee?.trim()) data.assignee = row.assignee.trim();
  if (row.context?.trim()) data.context = row.context.trim();
  return data;
}

function buildContentRow(
  row: Record<string, string | null>,
  projectId: string | null,
  userId: string
) {
  const data: Record<string, unknown> = {
    user_id: userId,
    title: row.title!.trim(),
  };
  if (projectId) data.project_id = projectId;
  if (row.body?.trim()) data.body = row.body.trim();
  if (row.platform?.trim()) data.platform = row.platform.trim().toLowerCase();
  if (row.type?.trim()) data.type = row.type.trim().toLowerCase();
  if (row.status?.trim()) {
    const s = row.status.trim().toLowerCase();
    if (["draft", "ready", "scheduled", "published"].includes(s))
      data.status = s;
  }
  if (row.scheduled_for?.trim()) data.scheduled_for = row.scheduled_for.trim();
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportBody;

    if (
      !body.module ||
      !["contacts", "tasks", "content", "pipeline"].includes(body.module)
    ) {
      return NextResponse.json(
        { error: "Valid module is required (contacts, tasks, content, pipeline)" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.mapped_data) || body.mapped_data.length === 0) {
      return NextResponse.json(
        { error: "Non-empty mapped_data array is required" },
        { status: 400 }
      );
    }
    if (!body.user_id) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }
    if (body.module === "contacts" && !body.project_id) {
      return NextResponse.json(
        { error: "project_id is required for contacts import" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const mod = body.module;
    const table = TABLE_NAME[mod];
    const uniqueKey = UNIQUE_KEY[mod];
    const requiredFields = REQUIRED_FIELDS[mod];

    // Check if target table has 0 rows for this user — skip duplicate detection if empty
    const countQuery = supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", body.user_id);

    // For contacts, scope count to project
    if (mod === "contacts" && body.project_id) {
      countQuery.eq("project_id", body.project_id);
    }

    const { count } = await countQuery;
    const tableIsEmpty = (count ?? 0) === 0;

    // Pre-fetch existing unique key values for duplicate detection (when table not empty)
    let existingKeys = new Set<string>();
    if (!tableIsEmpty && uniqueKey) {
      const existQuery = supabase
        .from(table)
        .select(uniqueKey)
        .eq("user_id", body.user_id);

      if (mod === "contacts" && body.project_id) {
        existQuery.eq("project_id", body.project_id);
      }

      const { data: existing } = await existQuery;
      if (existing) {
        for (const r of existing) {
          const val = String(
            (r as unknown as Record<string, unknown>)[uniqueKey] ?? ""
          )
            .toLowerCase()
            .trim();
          if (val) existingKeys.add(val);
        }
      }
    }

    // For pipeline imports, resolve pipeline + stages
    let pipelineId: string | null = null;
    const stageMap = new Map<string, string>(); // stage name → stage_id

    if (mod === "pipeline" && body.project_id) {
      // Find or create a default sales pipeline
      const { data: existingPipeline } = await supabase
        .from("pipelines")
        .select("id")
        .eq("project_id", body.project_id)
        .eq("user_id", body.user_id)
        .eq("type", "sales")
        .limit(1)
        .single();

      if (existingPipeline) {
        pipelineId = existingPipeline.id;
      } else {
        const { data: newPipeline } = await supabase
          .from("pipelines")
          .insert({
            project_id: body.project_id,
            user_id: body.user_id,
            name: "Sales Pipeline",
            type: "sales",
          })
          .select("id")
          .single();
        pipelineId = newPipeline?.id ?? null;
      }

      if (pipelineId) {
        // Fetch existing stages
        const { data: stages } = await supabase
          .from("pipeline_stages")
          .select("id, name")
          .eq("pipeline_id", pipelineId);

        if (stages) {
          for (const s of stages) {
            stageMap.set(s.name.toLowerCase().trim(), s.id);
          }
        }
      }
    }

    const results: RowResult[] = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < body.mapped_data.length; i++) {
      const row = body.mapped_data[i];

      // Skip empty rows
      const hasAnyValue = Object.values(row).some((v) => v && v.trim());
      if (!hasAnyValue) {
        skipped++;
        results.push({ row: i + 1, action: "skipped", reason: "Empty row" });
        continue;
      }

      // Check required fields
      const missing = requiredFields.filter((f) => !row[f]?.trim());
      if (missing.length > 0) {
        skipped++;
        results.push({
          row: i + 1,
          action: "skipped",
          reason: `Missing required: ${missing.join(", ")}`,
        });
        continue;
      }

      // Build row data per module
      let insertData: Record<string, unknown>;
      try {
        if (mod === "contacts") {
          insertData = buildContactRow(
            row,
            body.project_id!,
            body.user_id
          );
        } else if (mod === "tasks") {
          insertData = buildTaskRow(row, body.project_id, body.user_id);
        } else if (mod === "content") {
          insertData = buildContentRow(row, body.project_id, body.user_id);
        } else {
          // pipeline
          if (!pipelineId || !body.project_id) {
            skipped++;
            results.push({
              row: i + 1,
              action: "skipped",
              reason: "Pipeline not found",
            });
            continue;
          }

          const stageName = (row.stage ?? "Backlog").trim();
          let stageId = stageMap.get(stageName.toLowerCase());

          // Create stage if it doesn't exist
          if (!stageId) {
            const { data: newStage } = await supabase
              .from("pipeline_stages")
              .insert({
                pipeline_id: pipelineId,
                project_id: body.project_id,
                user_id: body.user_id,
                name: stageName,
                slug: stageName.toLowerCase().replace(/\s+/g, "-"),
                sort_order: stageMap.size,
              })
              .select("id")
              .single();

            if (newStage) {
              stageId = newStage.id;
              stageMap.set(stageName.toLowerCase(), stageId!);
            } else {
              skipped++;
              results.push({
                row: i + 1,
                action: "skipped",
                reason: `Failed to create stage: ${stageName}`,
              });
              continue;
            }
          }

          insertData = {
            pipeline_id: pipelineId,
            stage_id: stageId,
            project_id: body.project_id,
            user_id: body.user_id,
            title: row.title!.trim(),
            sort_order: i,
            metadata: row.value ? { value: row.value.trim() } : {},
          };
        }
      } catch {
        skipped++;
        results.push({
          row: i + 1,
          action: "skipped",
          reason: "Failed to build row data",
        });
        continue;
      }

      // Determine if this is a duplicate
      const keyValue = uniqueKey
        ? row[uniqueKey]?.trim()?.toLowerCase()
        : null;
      const isDuplicate =
        !tableIsEmpty && keyValue && existingKeys.has(keyValue);

      if (isDuplicate) {
        // Update existing row
        const updateQuery = supabase.from(table).update(insertData);

        if (mod === "contacts") {
          updateQuery
            .eq("user_id", body.user_id)
            .eq("project_id", body.project_id!)
            .eq("email", row[uniqueKey!]!.trim());
        } else if (mod === "pipeline") {
          updateQuery
            .eq("user_id", body.user_id)
            .eq("pipeline_id", pipelineId!)
            .eq("title", row[uniqueKey!]!.trim());
        } else {
          updateQuery
            .eq("user_id", body.user_id)
            .eq(uniqueKey!, row[uniqueKey!]!.trim());
        }

        const { error } = await updateQuery;

        if (error) {
          skipped++;
          results.push({
            row: i + 1,
            action: "skipped",
            reason: `Update failed: ${error.message}`,
          });
        } else {
          updated++;
          results.push({ row: i + 1, action: "updated" });
        }
      } else {
        // Insert new row
        const { error } = await supabase.from(table).insert(insertData);

        if (error) {
          skipped++;
          results.push({
            row: i + 1,
            action: "skipped",
            reason: `Insert failed: ${error.message}`,
          });
        } else {
          imported++;
          if (keyValue) existingKeys.add(keyValue);
          results.push({ row: i + 1, action: "imported" });
        }
      }
    }

    return NextResponse.json({
      imported,
      updated,
      skipped,
      total: body.mapped_data.length,
      results,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
