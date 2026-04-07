import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { uuidParam } from "@/lib/validations";
import { z } from "zod";

const updateProjectSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(["active", "planned", "paused", "archived"]).optional(),
  color: z.string().max(50).optional().nullable(),
});

export const PATCH = withErrorHandler(withAuth(async function PATCH(
  request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const body = await request.json();

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const updates = parsed.data;

  const { data, error } = await supabase
    .from("projects")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}));

export const DELETE = withErrorHandler(withAuth(async function DELETE(
  request: NextRequest,
  _user,
  context?: { params: Promise<Record<string, string>> }
) {
  const { id } = (await context?.params) ?? {};
  if (!id || !uuidParam.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid or missing id" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "true";

  if (!force) {
    const [tasksResult, pipelineResult] = await Promise.all([
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", id),
      supabase.from("pipeline_items").select("id", { count: "exact", head: true }).eq("project_id", id),
    ]);

    const childCount = (tasksResult.count ?? 0) + (pipelineResult.count ?? 0);
    if (childCount > 0) {
      return NextResponse.json(
        {
          error: "Project has associated items",
          details: {
            tasks: tasksResult.count ?? 0,
            pipeline_items: pipelineResult.count ?? 0,
          },
        },
        { status: 409 }
      );
    }
  }

  if (force) {
    await Promise.all([
      supabase.from("tasks").delete().eq("project_id", id),
      supabase.from("pipeline_items").delete().eq("project_id", id),
    ]);
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}));
