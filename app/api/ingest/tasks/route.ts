import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ingestTaskSchema } from "@/lib/validations";
import { withErrorHandler } from "@/lib/api-error-handler";
import { validateWebhookSignature } from "@/lib/webhook-auth";
import { logActivity } from "@/lib/activity-logger";
import { withRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const POST = withRateLimit(withErrorHandler(async function POST(request: NextRequest) {
  const authError = validateWebhookSecret(request);
  if (authError) return authError;

  const parsed = ingestTaskSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request body",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Compute priority_score using the scoring engine
  const taskForScoring: Task = {
    id: "",
    external_id: parsed.data.external_id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    status: parsed.data.status ?? "todo",
    priority: parsed.data.priority ?? "medium",
    due_date: parsed.data.due_date ?? null,
    assignee: parsed.data.assignee ?? null,
    tags: parsed.data.tags ?? null,
    project_id: parsed.data.project_id ?? null,
    recurrence_rule: null,
    recurrence_parent_id: null,
    is_recurring_template: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let project: { name: string } | null = null;
  if (parsed.data.project_id) {
    const { data: proj } = await supabase
      .from("projects")
      .select("name")
      .eq("id", parsed.data.project_id)
      .single();
    project = proj;
  }

  const { score } = scoreTask(taskForScoring, project);

  // Upsert by external_id for deduplication
  const { data, error } = await supabase
    .from("tasks")
    .upsert(
      { ...parsed.data, priority_score: score },
      { onConflict: "external_id" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  void logActivity({
    action: "ingested",
    entity_type: "task",
    entity_id: data.id,
    entity_name: data.title,
    source: "n8n",
  });

  return NextResponse.json({ success: true, data }, { status: 201 });
}), RATE_LIMITS.ingest);
