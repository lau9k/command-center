import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";
import { getTemplateById } from "@/lib/project-templates";

const createFromTemplateSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).max(500),
  description: z.string().max(10000).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
});

export const POST = withErrorHandler(withAuth(async function POST(request: NextRequest, _user) {
  const body = await request.json();
  const parsed = createFromTemplateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { templateId, name, description, color } = parsed.data;

  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json(
      { error: `Unknown template: ${templateId}` },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // Get a user_id from existing projects (service client has no auth context)
  const { data: existingProjects } = await supabase
    .from("projects")
    .select("user_id")
    .limit(1);

  const userId =
    (existingProjects as { user_id: string }[] | null)?.[0]?.user_id ?? null;

  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name,
      description: description ?? null,
      status: "active",
      color: color ?? template.color,
      ...(userId && { user_id: userId }),
    })
    .select("id")
    .single();

  if (projectError || !project) {
    return NextResponse.json(
      { error: `Failed to create project: ${projectError?.message ?? "Unknown error"}` },
      { status: 500 },
    );
  }

  const projectId = project.id;

  // 2. Seed tasks from template
  if (template.tasks.length > 0) {
    const now = new Date();
    const daysFromNow = (d: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() + d);
      return date.toISOString().slice(0, 10);
    };

    const taskRows = template.tasks.map((t) => ({
      project_id: projectId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      due_date: t.dueDaysFromNow !== null ? daysFromNow(t.dueDaysFromNow) : null,
      tags: t.tags,
      ...(userId && { user_id: userId }),
    }));

    const { error: tasksError } = await supabase.from("tasks").insert(taskRows);
    if (tasksError) {
      return NextResponse.json(
        { error: `Project created but failed to seed tasks: ${tasksError.message}` },
        { status: 500 },
      );
    }
  }

  // 3. Create pipeline and stages from template
  if (template.pipelineStages.length > 0 && userId) {
    const { data: pipeline, error: pipelineError } = await supabase
      .from("pipelines")
      .insert({
        project_id: projectId,
        user_id: userId,
        name: `${name} Pipeline`,
        type: template.pipelineType,
        stage_order: [],
      })
      .select("id")
      .single();

    if (pipelineError || !pipeline) {
      return NextResponse.json(
        { error: `Project created but failed to create pipeline: ${pipelineError?.message ?? "Unknown error"}` },
        { status: 500 },
      );
    }

    const stageRows = template.pipelineStages.map((s) => ({
      pipeline_id: pipeline.id,
      project_id: projectId,
      user_id: userId,
      name: s.name,
      slug: s.slug,
      sort_order: s.sort_order,
      color: s.color,
    }));

    const { error: stagesError } = await supabase
      .from("pipeline_stages")
      .insert(stageRows);

    if (stagesError) {
      return NextResponse.json(
        { error: `Project created but failed to seed pipeline stages: ${stagesError.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    projectId,
    tasksCreated: template.tasks.length,
    pipelineStagesCreated: template.pipelineStages.length,
  });
}));
