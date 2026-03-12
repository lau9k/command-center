import type { Task, Project } from "@/lib/types/database";

export interface TaskScoreResult {
  score: number;
  factors: string[];
}

/** Map project names (case-insensitive) to weight scores */
const PROJECT_WEIGHTS: Record<string, number> = {
  personize: 20,
  hackathons: 18,
  meek: 15,
  infrastructure: 12,
  eventium: 10,
  telco: 5,
};

const PRIORITY_SCORES: Record<string, number> = {
  critical: 25,
  high: 20,
  medium: 10,
  low: 5,
};

/**
 * Scores a task 0–100 based on deadline proximity, priority, project weight,
 * staleness, and dependency potential. Pure, deterministic, read-only.
 *
 * @param task - The task to score
 * @param project - The associated project (nullable)
 * @param blockingCount - Number of other tasks this task blocks (default 0)
 */
export function scoreTask(
  task: Task,
  project: Pick<Project, "id" | "name"> | null,
  blockingCount = 0,
): TaskScoreResult {
  const factors: { label: string; points: number }[] = [];
  const now = new Date();

  // 1. Deadline score (0–30)
  let deadlineScore = 0;
  if (task.due_date) {
    const due = new Date(task.due_date);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      deadlineScore = 30;
      const overdueDays = Math.abs(Math.floor(diffDays));
      factors.push({
        label: `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`,
        points: 30,
      });
    } else if (diffDays <= 1) {
      deadlineScore = 28;
      factors.push({ label: "Due today/tomorrow", points: 28 });
    } else if (diffDays <= 3) {
      deadlineScore = 22;
      factors.push({ label: "Due within 3 days", points: 22 });
    } else if (diffDays <= 7) {
      deadlineScore = 15;
      factors.push({ label: "Due this week", points: 15 });
    } else if (diffDays <= 14) {
      deadlineScore = 8;
      factors.push({ label: "Due within 2 weeks", points: 8 });
    } else {
      deadlineScore = 3;
      factors.push({ label: "Distant deadline", points: 3 });
    }
  }

  // 2. Priority score (0–25)
  const priorityScore = PRIORITY_SCORES[task.priority] ?? 10;
  if (priorityScore >= 20) {
    factors.push({
      label: `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority`,
      points: priorityScore,
    });
  }

  // 3. Project weight (0–20)
  let projectWeight = 10; // default for unknown projects
  if (project) {
    const key = project.name.toLowerCase();
    projectWeight = PROJECT_WEIGHTS[key] ?? 10;
    if (projectWeight >= 15) {
      factors.push({
        label: `High-priority project: ${project.name}`,
        points: projectWeight,
      });
    }
  }

  // 4. Staleness score (0–15)
  let stalenessScore = 0;
  const updatedAt = new Date(task.updated_at);
  const staleDays = Math.floor(
    (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (staleDays > 30) {
    stalenessScore = 15;
    factors.push({ label: `Stale for ${staleDays} days`, points: 15 });
  } else if (staleDays > 14) {
    stalenessScore = 10;
    factors.push({ label: `Untouched for ${staleDays} days`, points: 10 });
  } else if (staleDays > 7) {
    stalenessScore = 5;
    factors.push({ label: `Idle for ${staleDays} days`, points: 5 });
  }

  // 5. Dependency / blocking score (0–10)
  let dependencyScore = 0;
  if (blockingCount > 0) {
    dependencyScore = Math.min(blockingCount * 5, 10);
    factors.push({
      label: `Blocks ${blockingCount} task${blockingCount === 1 ? "" : "s"}`,
      points: dependencyScore,
    });
  }

  const totalScore = Math.min(
    deadlineScore + priorityScore + projectWeight + stalenessScore + dependencyScore,
    100,
  );

  // Return top 3 factors sorted by points descending
  factors.sort((a, b) => b.points - a.points);
  const topFactors = factors.slice(0, 3).map((f) => f.label);

  return { score: totalScore, factors: topFactors };
}
