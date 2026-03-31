"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TaskWithProject } from "@/lib/types/database";

interface ContactTasksTabProps {
  contactId: string;
}

const statusIcon: Record<string, React.ReactNode> = {
  todo: <Circle className="size-4 text-muted-foreground" />,
  in_progress: <Clock className="size-4 text-blue-500" />,
  done: <CheckCircle2 className="size-4 text-green-500" />,
  blocked: <AlertTriangle className="size-4 text-red-500" />,
};

const priorityColor: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  low: "bg-muted text-muted-foreground",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ContactTasksTab({ contactId }: ContactTasksTabProps) {
  const [tasks, setTasks] = useState<TaskWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchTasks() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tasks?contact_id=${contactId}`);
        if (!res.ok) throw new Error("Failed to fetch tasks");
        const json = await res.json();
        if (!cancelled) setTasks(json.data ?? []);
      } catch {
        if (!cancelled) setError("Could not load tasks");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="py-12 text-center">
        <Circle className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          No tasks linked to this contact
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-3 px-4 py-3"
        >
          {statusIcon[task.status] ?? <Circle className="size-4" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{task.title}</p>
            {task.due_date && (
              <p className="text-xs text-muted-foreground">
                Due {formatDate(task.due_date)}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className={`text-xs ${priorityColor[task.priority] ?? ""}`}
          >
            {task.priority}
          </Badge>
          {task.projects && (
            <Badge variant="outline" className="text-xs">
              {task.projects.name}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
