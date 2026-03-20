"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Calendar, UserCheck } from "lucide-react";
import type { TaskPriority } from "@/lib/types/database";

// ---- shared types for the three sections ----

export interface FocusTask {
  id: string;
  title: string;
  priority: TaskPriority;
  due_date: string | null;
  project_name: string | null;
  project_color: string | null;
}

export interface StaleContact {
  id: string;
  name: string;
  company: string | null;
  days_since_contact: number;
  tag: string;
}

interface TodaysFocusWidgetProps {
  overdueTasks: FocusTask[];
  dueTodayTasks: FocusTask[];
  staleContacts: StaleContact[];
}

// ---- priority helpers ----

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ---- sub-components ----

function SectionHeader({
  icon,
  label,
  count,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold ${colorClass}`}>
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span className="ml-auto tabular-nums">{count}</span>
      )}
    </div>
  );
}

function TaskRow({ task, onClick }: { task: FocusTask; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
    >
      <span className={`size-2 shrink-0 rounded-full ${PRIORITY_COLORS[task.priority]}`} />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{task.title}</span>
      {task.project_name && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: task.project_color ? `${task.project_color}20` : "#6366F120",
            color: task.project_color ?? "#6366F1",
          }}
        >
          {task.project_name}
        </span>
      )}
      {task.due_date && (
        <span className="shrink-0 text-xs text-muted-foreground">{formatDueDate(task.due_date)}</span>
      )}
    </button>
  );
}

function ContactRow({ contact, onClick }: { contact: StaleContact; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
    >
      <span className="size-2 shrink-0 rounded-full bg-blue-500" />
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{contact.name}</span>
      {contact.company && (
        <span className="shrink-0 text-xs text-muted-foreground">{contact.company}</span>
      )}
      <span className="shrink-0 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
        {contact.days_since_contact}d ago
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground">{contact.tag}</span>
    </button>
  );
}

// ---- main widget ----

export function TodaysFocusWidget({
  overdueTasks,
  dueTodayTasks,
  staleContacts,
}: TodaysFocusWidgetProps) {
  const router = useRouter();

  const sortedOverdue = [...overdueTasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
  const sortedDueToday = [...dueTodayTasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  return (
    <section className="flex-1 rounded-xl border border-border bg-card">
      <div className="px-4 pt-4 pb-1">
        <h2 className="text-lg font-semibold text-foreground">Today&apos;s Focus</h2>
        <p className="text-xs text-muted-foreground">What needs attention right now</p>
      </div>

      <div className="divide-y divide-border">
        {/* Overdue */}
        <div className="px-3 py-3">
          <SectionHeader
            icon={<AlertTriangle className="size-3.5" />}
            label="Overdue"
            count={sortedOverdue.length}
            colorClass="bg-red-500/10 text-red-600 dark:text-red-400"
          />
          {sortedOverdue.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              No overdue tasks
            </p>
          ) : (
            <div className="mt-1">
              {sortedOverdue.map((t) => (
                <TaskRow key={t.id} task={t} onClick={() => router.push(`/tasks?id=${t.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Due Today */}
        <div className="px-3 py-3">
          <SectionHeader
            icon={<Calendar className="size-3.5" />}
            label="Due Today"
            count={sortedDueToday.length}
            colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          {sortedDueToday.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              Nothing due today
            </p>
          ) : (
            <div className="mt-1">
              {sortedDueToday.map((t) => (
                <TaskRow key={t.id} task={t} onClick={() => router.push(`/tasks?id=${t.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Needs Follow-Up */}
        <div className="px-3 py-3">
          <SectionHeader
            icon={<UserCheck className="size-3.5" />}
            label="Needs Follow-Up"
            count={staleContacts.length}
            colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          />
          {staleContacts.length === 0 ? (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              All contacts recently touched
            </p>
          ) : (
            <div className="mt-1">
              {staleContacts.map((c) => (
                <ContactRow key={c.id} contact={c} onClick={() => router.push("/contacts")} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
