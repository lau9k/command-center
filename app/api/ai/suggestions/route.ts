import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";
import { scoreTask } from "@/lib/task-scoring";
import { smartRecall } from "@/lib/personize/actions";
import type { TaskWithProject } from "@/lib/types/database";

export interface SuggestedTask {
  id: string;
  title: string;
  projectName: string | null;
  projectColor: string | null;
  priority: string;
  dueDate: string | null;
  score: number;
  reason: string;
}

function generateReason(
  task: TaskWithProject,
  score: number,
  factors: { label: string; score: number; maxScore: number }[],
  personizeContext: string | null,
): string {
  if (personizeContext) return personizeContext;

  const deadlineFactor = factors.find((f) => f.label === "Deadline proximity");
  const blockingFactor = factors.find((f) => f.label === "Dependency blocking");
  const stalenessFactor = factors.find((f) => f.label === "Staleness");

  if (blockingFactor && blockingFactor.score > 0) {
    return "blocked dependency unresolved";
  }

  if (deadlineFactor && deadlineFactor.score >= 28) {
    if (task.due_date) {
      const daysUntil = Math.ceil(
        (new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntil <= 0) return "overdue — needs immediate attention";
      return `due in ${daysUntil * 24}h`;
    }
    return "due very soon";
  }

  if (deadlineFactor && deadlineFactor.score >= 22) {
    return "due within 3 days";
  }

  if (stalenessFactor && stalenessFactor.score >= 10) {
    return "stale — no updates in over 2 weeks";
  }

  if (task.priority === "critical") {
    return "critical priority task";
  }

  if (score >= 50) {
    return "high priority across multiple factors";
  }

  return "recommended based on priority and timing";
}

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

  const scored = tasks
    .map((task) => {
      const { score, factors } = scoreTask(task, task.projects);
      return { task, score, factors };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // Try to enrich top tasks with Personize context
  let personizeReasons: (string | null)[] = scored.map(() => null);
  try {
    if (process.env.PERSONIZE_SECRET_KEY && scored.length > 0) {
      const taskTitles = scored.map((s) => s.task.title).join(", ");
      const recallResult = await smartRecall(
        `Priority tasks needing attention: ${taskTitles}`,
      );
      if (recallResult) {
        const context =
          typeof recallResult === "object" && "compiledContext" in recallResult
            ? (recallResult as { compiledContext?: string }).compiledContext
            : null;
        if (context) {
          personizeReasons = scored.map(() => null);
          // Personize context available but applies broadly — keep rule-based reasons
        }
      }
    }
  } catch {
    // Personize unavailable — fall back to rule-based reasons
  }

  const suggestions: SuggestedTask[] = scored.map(({ task, score, factors }, i) => ({
    id: task.id,
    title: task.title,
    projectName: task.projects?.name ?? null,
    projectColor: task.projects?.color ?? null,
    priority: task.priority,
    dueDate: task.due_date,
    score,
    reason: generateReason(task, score, factors, personizeReasons[i]),
  }));

  return NextResponse.json({ data: suggestions });
});
