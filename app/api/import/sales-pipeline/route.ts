import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { z } from "zod";
import { withAuth } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

const salesPipelineImportSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string().nullable().optional()))
    .min(1, "non-empty rows array is required"),
  project_id: z.string().uuid(),
  user_id: z.string().min(1),
});

const DEFAULT_STAGES = [
  { name: "Lead", slug: "lead", sort_order: 0, color: "#6B7280" },
  { name: "Qualified", slug: "qualified", sort_order: 1, color: "#3B82F6" },
  { name: "Demo", slug: "demo", sort_order: 2, color: "#8B5CF6" },
  { name: "Proposal", slug: "proposal", sort_order: 3, color: "#F59E0B" },
  { name: "Negotiation", slug: "negotiation", sort_order: 4, color: "#EF4444" },
  { name: "Closed Won", slug: "closed-won", sort_order: 5, color: "#10B981" },
  { name: "Closed Lost", slug: "closed-lost", sort_order: 6, color: "#9CA3AF" },
];

interface DealRow {
  "Deal Name"?: string;
  Company?: string;
  "Contact Name"?: string;
  Stage?: string;
  "Deal Value"?: string;
  "Close Date"?: string;
  "Next Action"?: string;
  Probability?: string;
  Notes?: string;
  [key: string]: string | undefined;
}

export const POST = withAuth(async function POST(request: NextRequest, _user) {
  try {
    const raw = await request.json();
    const parsed = salesPipelineImportSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const body = parsed.data as {
      rows: DealRow[];
      project_id: string;
      user_id: string;
    };

    const supabase = createServiceClient();

    // Find or create the Personize sales pipeline
    const { data: existingPipeline } = await supabase
      .from("pipelines")
      .select("id")
      .eq("project_id", body.project_id)
      .eq("type", "sales")
      .limit(1)
      .single();

    let pipelineId: string;

    if (existingPipeline) {
      pipelineId = existingPipeline.id;
    } else {
      const { data: newPipeline, error: pipelineError } = await supabase
        .from("pipelines")
        .insert({
          project_id: body.project_id,
          user_id: body.user_id,
          name: "Sales Pipeline",
          type: "sales",
          stage_order: DEFAULT_STAGES.map((s) => s.slug),
        })
        .select("id")
        .single();

      if (pipelineError || !newPipeline) {
        return NextResponse.json(
          { error: `Failed to create pipeline: ${pipelineError?.message}` },
          { status: 500 }
        );
      }
      pipelineId = newPipeline.id;

      // Create default stages
      const stageInserts = DEFAULT_STAGES.map((s) => ({
        pipeline_id: pipelineId,
        project_id: body.project_id,
        user_id: body.user_id,
        name: s.name,
        slug: s.slug,
        sort_order: s.sort_order,
        color: s.color,
      }));

      const { error: stagesError } = await supabase
        .from("pipeline_stages")
        .insert(stageInserts);

      if (stagesError) {
        return NextResponse.json(
          { error: `Failed to create stages: ${stagesError.message}` },
          { status: 500 }
        );
      }
    }

    // Load stages for lookup
    const { data: stages } = await supabase
      .from("pipeline_stages")
      .select("id, name, slug")
      .eq("pipeline_id", pipelineId);

    if (!stages || stages.length === 0) {
      return NextResponse.json(
        { error: "No pipeline stages found" },
        { status: 500 }
      );
    }

    // Build stage lookup (case-insensitive name match)
    const stageLookup = new Map<string, string>();
    for (const s of stages) {
      stageLookup.set(s.name.toLowerCase(), s.id);
      stageLookup.set(s.slug.toLowerCase(), s.id);
    }

    const defaultStageId = stages[0].id; // "Lead" as fallback

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i];
      try {
        const title = row["Deal Name"]?.trim();
        if (!title) {
          skipped++;
          continue;
        }

        const stageName = row.Stage?.trim()?.toLowerCase() || "";
        const stageId = stageLookup.get(stageName) || defaultStageId;

        const metadata: Record<string, unknown> = {};
        if (row.Company?.trim()) metadata.company = row.Company.trim();
        if (row["Contact Name"]?.trim())
          metadata.contact_name = row["Contact Name"].trim();
        if (row["Deal Value"]?.trim())
          metadata.deal_value = row["Deal Value"].trim();
        if (row["Close Date"]?.trim())
          metadata.close_date = row["Close Date"].trim();
        if (row["Next Action"]?.trim())
          metadata.next_action = row["Next Action"].trim();
        if (row.Probability?.trim())
          metadata.probability = row.Probability.trim();
        if (row.Notes?.trim()) metadata.notes = row.Notes.trim();

        const { error } = await supabase.from("pipeline_items").insert({
          pipeline_id: pipelineId,
          stage_id: stageId,
          project_id: body.project_id,
          user_id: body.user_id,
          title,
          entity_type: "deal",
          metadata,
        });

        if (error) throw new Error(error.message);
        imported++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`Row ${i + 1}: ${msg}`);
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
});
