import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  InteractiveCardLink,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusBadgeClass } from "@/lib/design-tokens";

interface ProjectTask {
  id: string;
  title: string;
  due_date: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  taskCount: number;
  upcomingTasks: ProjectTask[];
}

interface ProjectSummaryCardsProps {
  projects: ProjectSummary[];
}

const statusVariant: Record<string, string> = {
  active: statusBadgeClass.active,
  paused: statusBadgeClass.paused,
  completed: statusBadgeClass.completed,
  archived: statusBadgeClass.archived,
};

function formatDueDate(date: string | null): string {
  if (!date) return "No date";
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays}d`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProjectSummaryCards({ projects }: ProjectSummaryCardsProps) {
  if (projects.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Projects</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Card key={project.id} variant="interactive" className="gap-4">
            <CardHeader className="px-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">{project.name}</CardTitle>
                <Badge
                  className={
                    statusVariant[project.status] ?? statusVariant.active
                  }
                >
                  {project.status}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                {project.taskCount} task{project.taskCount !== 1 ? "s" : ""}
              </span>
            </CardHeader>

            {project.upcomingTasks.length > 0 && (
              <CardContent className="px-0">
                <ul className="space-y-2">
                  {project.upcomingTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="truncate text-foreground">
                        {task.title}
                      </span>
                      <span className="ml-2 shrink-0 text-xs text-text-muted">
                        {formatDueDate(task.due_date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}

            <CardFooter className="px-0">
              <Link href={`/projects/${project.slug}`}>
                <InteractiveCardLink label="Open Project" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
