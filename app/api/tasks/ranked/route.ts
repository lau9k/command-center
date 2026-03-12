import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { scoreTask } from "@/lib/task-scoring";
import type { Task } from "@/lib/types/database";

interface TaskRow extends Task {
  projects: { id: string; name: string; color: string | null } | null;
}

export interface RankedTask extends TaskRow {
  score: number;
  factors: string[];
}

export const GET = withErrorHandler(async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const { searchParams } = request.nextUrl;

  const limit = parseInt(searchParams.get("limit") ?? "50", 10);
  const projectId = searchParams.get("project_id");

  let query = supabase
    .from("tasks")
    .select("*, projects(id, name, color)")
    .neq("status", "done");

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const tasks = (data ?? []) as TaskRow[];

  const ranked: RankedTask[] = tasks.map((task) => {
    const { score, factors } = scoreTask(task, task.projects);
    return { ...task, score, factors };
  });

  ranked.sort((a, b) => b.score - a.score);

  const limited = ranked.slice(0, Math.max(1, limit));

  return NextResponse.json({ data: limited });
});
