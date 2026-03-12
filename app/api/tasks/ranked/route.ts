import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { scoreTask } from "@/lib/task-scoring";
import type { TaskWithProject } from "@/lib/types/database";

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(id, name, color)")
    .neq("status", "done");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasks = (data ?? []) as TaskWithProject[];

  const ranked = tasks
    .map((task) => {
      const { score, factors } = scoreTask(task, task.projects);
      return { ...task, score, factors };
    })
    .sort((a, b) => b.score - a.score);

  return NextResponse.json({ data: ranked });
});
