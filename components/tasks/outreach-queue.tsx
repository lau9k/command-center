"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Send,
  CheckCircle2,
  Target,
  Users,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyMessageButton } from "@/components/copy-message-button";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import { cn } from "@/lib/utils";
import type {
  TaskWithProject,
  TaskStatus,
  TaskPriority,
} from "@/lib/types/database";

/* ─── helpers ─── */

const LINKEDIN_URL_RE = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s)]+/i;

function extractLinkedInUrl(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(LINKEDIN_URL_RE);
  return match ? match[0] : null;
}

function stripLinkedInUrl(description: string | null): string {
  if (!description) return "";
  return description.replace(LINKEDIN_URL_RE, "").trim();
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: "bg-red-500/10 text-red-500",
  high: "bg-orange-500/10 text-orange-500",
  medium: "bg-yellow-500/10 text-yellow-500",
  low: "bg-green-500/10 text-green-500",
};

const ALL_VALUE = "__all__";

/* ─── types ─── */

interface OutreachKpis {
  totalOutreach: number;
  sentToday: number;
  responseRate: number;
  remaining: number;
}

interface OutreachQueueProps {
  kpis: OutreachKpis;
}

/* ─── component ─── */

export function OutreachQueue({ kpis }: OutreachQueueProps) {
  const queryClient = useQueryClient();

  const { data: allTasks = [] } = useQuery<TaskWithProject[]>({
    queryKey: ["tasks", "list"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      return (json.data as TaskWithProject[]) ?? [];
    },
    staleTime: 30_000,
  });

  const outreachTasks = allTasks.filter((t) =>
    t.tags?.some((tag) => tag.toLowerCase() === "outreach")
  );

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>(ALL_VALUE);
  const [filterTag, setFilterTag] = useState<string>(ALL_VALUE);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleDone = useCallback(
    async (task: TaskWithProject) => {
      const newStatus: TaskStatus =
        task.status === "done" ? "todo" : "done";

      const previous = queryClient.getQueryData<TaskWithProject[]>([
        "tasks",
        "list",
      ]);

      queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
        old?.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
      );

      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to update");
        toast.success(
          newStatus === "done" ? "Marked as sent" : "Marked as pending"
        );
      } catch {
        queryClient.setQueryData(["tasks", "list"], previous);
        toast.error("Failed to update status");
      }
    },
    [queryClient]
  );

  const handleDelete = useCallback(
    async (task: TaskWithProject) => {
      const previous = queryClient.getQueryData<TaskWithProject[]>([
        "tasks",
        "list",
      ]);

      queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
        old?.filter((t) => t.id !== task.id)
      );

      try {
        const res = await fetch(`/api/tasks/${task.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete");
        toast.success("Task deleted");
      } catch {
        queryClient.setQueryData(["tasks", "list"], previous);
        toast.error("Failed to delete task");
      }
    },
    [queryClient]
  );

  /* ─── filtering & sorting ─── */

  const filtered = outreachTasks.filter((t) => {
    if (filterStatus === "todo" && t.status === "done") return false;
    if (filterStatus === "done" && t.status !== "done") return false;
    if (
      filterTag !== ALL_VALUE &&
      !t.tags?.some((tag) => tag.toLowerCase() === filterTag)
    )
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !t.title.toLowerCase().includes(q) &&
        !(t.assignee ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.created_at.localeCompare(b.created_at);
  });

  /* ─── tag options ─── */

  const tierTags = ["tier-1", "tier-2"];

  return (
    <div className="space-y-4">
      {/* KPI Strip */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Total Outreach"
          value={kpis.totalOutreach}
          subtitle="tasks in queue"
          icon={<Users className="size-5" />}
        />
        <KpiCard
          label="Sent Today"
          value={kpis.sentToday}
          subtitle="completed today"
          icon={<Send className="size-5" />}
        />
        <KpiCard
          label="Response Rate"
          value={`${kpis.responseRate}%`}
          subtitle="done / total"
          icon={<Target className="size-5" />}
        />
        <KpiCard
          label="Remaining"
          value={kpis.remaining}
          subtitle="still pending"
          icon={<CheckCircle2 className="size-5" />}
        />
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by contact name or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Status</SelectItem>
            <SelectItem value="todo">Pending</SelectItem>
            <SelectItem value="done">Sent</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Tiers</SelectItem>
            {tierTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <SharedEmptyState
          icon={<Send className="size-12" />}
          title="No outreach tasks"
          description={
            outreachTasks.length === 0
              ? 'Create tasks with the "outreach" tag to populate this queue.'
              : "No tasks match your current filters."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-3 py-2.5" />
                <th className="w-8 px-1 py-2.5" />
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Contact Name
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Company
                </th>
                <th className="hidden px-3 py-2.5 text-left font-medium text-muted-foreground md:table-cell">
                  Message Preview
                </th>
                <th className="w-12 px-3 py-2.5 text-center font-medium text-muted-foreground">
                  LinkedIn
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Priority
                </th>
                <th className="hidden px-3 py-2.5 text-left font-medium text-muted-foreground sm:table-cell">
                  Tags
                </th>
                <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((task) => {
                const linkedInUrl = extractLinkedInUrl(task.description);
                const messagePreview = stripLinkedInUrl(task.description);
                const isExpanded = expandedId === task.id;
                const isDone = task.status === "done";

                return (
                  <OutreachRow
                    key={task.id}
                    task={task}
                    isDone={isDone}
                    isExpanded={isExpanded}
                    linkedInUrl={linkedInUrl}
                    messagePreview={messagePreview}
                    onToggleDone={() => handleToggleDone(task)}
                    onToggleExpand={() =>
                      setExpandedId(isExpanded ? null : task.id)
                    }
                    onDelete={() => handleDelete(task)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── row component ─── */

interface OutreachRowProps {
  task: TaskWithProject;
  isDone: boolean;
  isExpanded: boolean;
  linkedInUrl: string | null;
  messagePreview: string;
  onToggleDone: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
}

function OutreachRow({
  task,
  isDone,
  isExpanded,
  linkedInUrl,
  messagePreview,
  onToggleDone,
  onToggleExpand,
  onDelete,
}: OutreachRowProps) {
  const [copied, setCopied] = useState(false);
  const nonOutreachTags = (task.tags ?? []).filter(
    (tag) => tag.toLowerCase() !== "outreach"
  );

  const handleCopy = useCallback(async () => {
    const text = task.description;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [task.description]);

  return (
    <>
      <tr
        className={cn(
          "border-b border-border transition-colors hover:bg-muted/30 cursor-pointer",
          isDone && "opacity-60"
        )}
        onClick={onToggleExpand}
      >
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isDone}
            onCheckedChange={onToggleDone}
            aria-label={`Mark "${task.title}" as ${isDone ? "pending" : "sent"}`}
          />
        </td>
        <td className="px-1 py-2.5 text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </td>
        <td
          className={cn(
            "px-3 py-2.5 font-medium",
            isDone && "line-through"
          )}
        >
          {task.title}
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">
          {task.assignee ?? "—"}
        </td>
        <td className="hidden max-w-xs truncate px-3 py-2.5 text-muted-foreground md:table-cell">
          {messagePreview || "—"}
        </td>
        <td
          className="px-3 py-2.5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {linkedInUrl ? (
            <a
              href={linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md p-1 text-blue-500 transition-colors hover:bg-blue-500/10"
              aria-label={`Open LinkedIn profile for ${task.title}`}
            >
              <ExternalLink className="size-4" />
            </a>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          )}
        </td>
        <td className="px-3 py-2.5">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
              PRIORITY_COLORS[task.priority]
            )}
          >
            {task.priority}
          </span>
        </td>
        <td className="hidden px-3 py-2.5 sm:table-cell">
          <div className="flex flex-wrap gap-1">
            {nonOutreachTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </td>
        <td
          className="px-3 py-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
            <div className="flex items-center justify-end gap-1">
              {task.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleCopy}
                      aria-label={copied ? "Copied!" : "Copy message"}
                    >
                      {copied ? (
                        <Check className="text-green-600 dark:text-green-400" />
                      ) : (
                        <Copy />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? "Copied!" : "Copy message"}</TooltipContent>
                </Tooltip>
              )}

              {(linkedInUrl ?? task.external_url) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon-xs" asChild>
                      <a
                        href={(linkedInUrl ?? task.external_url)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Open LinkedIn"
                      >
                        <ExternalLink />
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Open LinkedIn</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onToggleDone()}
                    aria-label={isDone ? "Mark pending" : "Mark done"}
                  >
                    <Check className={isDone ? "text-green-600 dark:text-green-400" : ""} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDone ? "Mark pending" : "Mark done"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={onDelete}
                    aria-label="Delete task"
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </td>
      </tr>
      {isExpanded && messagePreview && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={9} className="px-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Message Template
                </p>
                <CopyMessageButton text={task.description ?? ""} />
              </div>
              <div className="rounded-md border border-border bg-background p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {messagePreview}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
