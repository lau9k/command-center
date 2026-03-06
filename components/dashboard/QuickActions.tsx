import Link from "next/link";
import { ListChecks, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface QuickActionsProps {
  projects: ProjectOption[];
}

export function QuickActions({ projects }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href="/tasks">
          <ListChecks className="mr-2 h-4 w-4" />
          View All Tasks
        </Link>
      </Button>
      {projects.map((project) => (
        <Button key={project.id} variant="outline" size="sm" asChild>
          <Link href={`/projects/${project.id}/pipeline`}>
            <GitBranch className="mr-2 h-4 w-4" />
            {project.name} Pipeline
          </Link>
        </Button>
      ))}
    </div>
  );
}
