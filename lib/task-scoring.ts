import type { Task, TaskPriority } from "@/lib/types/database";

export interface ScoringFactor {
  label: string;
  score: number;
  maxScore: number;
}

export interface TaskScore {
  score: number;
  factors: ScoringFactor[];
}

/** Project name → weight mapping (case-insensitive match) */
const PROJECT_WEIGHTS: Record<string, number> = {
  personize: 20,
  hackathons: 18,
  meek: 15,
  infrastructure: 12,
  eventium: 10,
  telco: 5,
};

const PRIORITY_SCORES: Record<TaskPriority, number> = {
  critical: 25,
  high: 18,
  medium: 10,
  low: 3,
};

/**
 * Score a task from 0–100 based on rule-based factors.
 * @param task      The task to score (with optional project info)
 * @param project   Optional project reference { name }
 */
export function scoreTask(
  task: Task,
  project?: { name: string } | null
): TaskScore {
  const factors: ScoringFactor[] = [];

  // 1. Deadline proximity (0-30)
  let deadlineScore = 0;
  if (task.due_date) {
    const now = Date.now();
    const due = new Date(task.due_date).getTime();
    const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);

    if (daysUntilDue <= 0) {
      deadlineScore = 30; // overdue
    } else if (daysUntilDue <= 1) {
      deadlineScore = 28;
    } else if (daysUntilDue <= 3) {
      deadlineScore = 22;
    } else if (daysUntilDue <= 7) {
      deadlineScore = 15;
    } else if (daysUntilDue <= 14) {
      deadlineScore = 8;
    } else {
      deadlineScore = 2;
    }
  }
  factors.push({ label: "Deadline proximity", score: deadlineScore, maxScore: 30 });

  // 2. Priority level (0-25)
  const priorityScore = PRIORITY_SCORES[task.priority] ?? 0;
  factors.push({ label: "Priority level", score: priorityScore, maxScore: 25 });

  // 3. Project weight (0-20)
  let projectScore = 0;
  if (project?.name) {
    const key = project.name.toLowerCase();
    projectScore = PROJECT_WEIGHTS[key] ?? 0;
  }
  factors.push({ label: "Project weight", score: projectScore, maxScore: 20 });

  // 4. Staleness — task not updated in >7 days (0-15)
  let stalenessScore = 0;
  const updatedAt = new Date(task.updated_at).getTime();
  const daysSinceUpdate = (Date.now() - updatedAt) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate > 7) {
    // Scale: 7→5, 14→10, 21+→15
    stalenessScore = Math.min(15, Math.round((daysSinceUpdate / 21) * 15));
  }
  factors.push({ label: "Staleness", score: stalenessScore, maxScore: 15 });

  // 5. Dependency blocking — blocked tasks get a boost (0-10)
  const blockingScore = task.status === "blocked" ? 10 : 0;
  factors.push({ label: "Dependency blocking", score: blockingScore, maxScore: 10 });

  const total = Math.min(
    100,
    deadlineScore + priorityScore + projectScore + stalenessScore + blockingScore
  );

  return { score: total, factors };
}
