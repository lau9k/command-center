import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { z } from "zod";

export const runtime = "nodejs";

const dealSchema = z.object({
  title: z.string().min(1).max(500),
  company: z.string().max(500).optional().nullable(),
  value: z.union([z.number(), z.string()]).optional().nullable(),
  stage: z.string().max(200).optional().nullable(),
  owner: z.string().max(200).optional().nullable(),
  close_date: z.string().max(50).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

const importBodySchema = z.object({
  deals: z.array(dealSchema).min(1, "At least one deal is required"),
  project_id: z.string().uuid(),
  pipeline_id: z.string().uuid(),
});

function parseNumericValue(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const cleaned = raw.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      if (values[j]) row[headers[j]] = values[j];
    }
    if (Object.values(row).some((v) => v)) rows.push(row);
  }

  return rows;
}

export const POST = withErrorHandler(async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const supabase = createServiceClient();

  let deals: z.infer<typeof dealSchema>[];
  let projectId: string;
  let pipelineId: string;

  if (contentType.includes("text/csv")) {
    const text = await request.text();
    const { searchParams } = new URL(request.url);
    projectId = searchParams.get("project_id") ?? "";
    pipelineId = searchParams.get("pipeline_id") ?? "";

    if (!z.string().uuid().safeParse(projectId).success) {
      return NextResponse.json({ error: "project_id query param required (uuid)" }, { status: 400 });
    }
    if (!z.string().uuid().safeParse(pipelineId).success) {
      return NextResponse.json({ error: "pipeline_id query param required (uuid)" }, { status: 400 });
    }

    const rows = parseCSV(text);
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 });
    }

    deals = rows.map((row) => ({
      title: row.title ?? row.name ?? row.deal_name ?? "",
      company: row.company ?? row.company_name ?? null,
      value: row.value ?? row.deal_value ?? row.amount ?? null,
      stage: row.stage ?? null,
      owner: row.owner ?? row.assignee ?? null,
      close_date: row.close_date ?? row.expected_close ?? null,
      notes: row.notes ?? null,
    }));
  } else {
    const body = await request.json();
    const parsed = importBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    deals = parsed.data.deals;
    projectId = parsed.data.project_id;
    pipelineId = parsed.data.pipeline_id;
  }

  // Fetch stages for this pipeline to resolve stage names → IDs
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, slug, sort_order")
    .eq("pipeline_id", pipelineId)
    .order("sort_order", { ascending: true });

  if (!stages || stages.length === 0) {
    return NextResponse.json({ error: "No stages found for this pipeline" }, { status: 400 });
  }

  const stageBySlug = new Map(stages.map((s) => [s.slug.toLowerCase(), s.id]));
  const stageByName = new Map(stages.map((s) => [s.name.toLowerCase(), s.id]));
  const defaultStageId = stages[0].id;

  function resolveStageId(stageName: string | null | undefined): string {
    if (!stageName) return defaultStageId;
    const lower = stageName.toLowerCase().trim();
    return stageBySlug.get(lower) ?? stageByName.get(lower) ?? defaultStageId;
  }

  // Check existing titles for duplicate detection
  const { data: existingItems } = await supabase
    .from("pipeline_items")
    .select("title")
    .eq("pipeline_id", pipelineId);

  const existingTitles = new Set(
    (existingItems ?? []).map((item) => item.title.trim().toLowerCase()),
  );

  const results: { row: number; status: "imported" | "skipped"; reason?: string }[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < deals.length; i++) {
    const deal = deals[i];

    if (!deal.title?.trim()) {
      results.push({ row: i + 1, status: "skipped", reason: "Missing title" });
      skipped++;
      continue;
    }

    const titleLower = deal.title.trim().toLowerCase();
    if (existingTitles.has(titleLower)) {
      results.push({ row: i + 1, status: "skipped", reason: `Duplicate title: ${deal.title}` });
      skipped++;
      continue;
    }

    const numericValue = parseNumericValue(deal.value);
    const metadata: Record<string, unknown> = {};
    if (deal.company) metadata.company = deal.company;
    if (numericValue != null) metadata.deal_value = numericValue;
    if (deal.owner) metadata.owner = deal.owner;
    if (deal.close_date) metadata.close_date = deal.close_date;
    if (deal.notes) metadata.notes = deal.notes;

    const record = {
      title: deal.title.trim(),
      pipeline_id: pipelineId,
      stage_id: resolveStageId(deal.stage),
      project_id: projectId,
      entity_type: "deal",
      sort_order: i,
      metadata,
    };

    const { error } = await supabase.from("pipeline_items").insert(record);

    if (error) {
      results.push({ row: i + 1, status: "skipped", reason: `Insert failed: ${error.message}` });
      skipped++;
      continue;
    }

    existingTitles.add(titleLower);
    results.push({ row: i + 1, status: "imported" });
    imported++;
  }

  return NextResponse.json({ imported, skipped, total: deals.length, results });
});
