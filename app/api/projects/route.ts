import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withAuth } from "@/lib/auth/api-guard";

export const GET = withErrorHandler(withAuth(async function GET() {
  const supabase = createServiceClient();

  const [projectsResult, tasksResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, color, description, created_at")
      .order("name"),
    supabase
      .from("tasks")
      .select("project_id")
      .neq("status", "done"),
  ]);

  if (projectsResult.error) {
    return NextResponse.json(
      { error: projectsResult.error.message },
      { status: 500 },
    );
  }

  if (tasksResult.error) {
    return NextResponse.json(
      { error: tasksResult.error.message },
      { status: 500 },
    );
  }

  const taskCountsByProject = new Map<string, number>();
  for (const task of tasksResult.data) {
    if (task.project_id) {
      taskCountsByProject.set(
        task.project_id,
        (taskCountsByProject.get(task.project_id) ?? 0) + 1,
      );
    }
  }

  const data = projectsResult.data.map((project) => ({
    ...project,
    taskCount: taskCountsByProject.get(project.id) ?? 0,
  }));

  return NextResponse.json({ data });
}));
