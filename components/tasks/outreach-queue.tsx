"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  TaskOutreachStatus,
} from "@/lib/types/database";
import {
  updateTaskFields,
  updateTaskStatus,
  deleteTask,
  batchUpdateOutreachStatus,
} from "@/lib/actions/tasks";
import { SYSTEM_TAGS } from "@/lib/constants/tags";

/* ─── helpers ─── */

function getLinkedInUrl(task: TaskWithProject): string | null {
  return task.external_url ?? task.contacts?.linkedin_url ?? null;
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

const OUTREACH_STATUS_CONFIG: Record<
  TaskOutreachStatus,
  { label: string; className: string }
> = {
  queued: {
    label: "Queued",
    className: "bg-gray-500/10 text-gray-500 dark:bg-gray-400/10 dark:text-gray-400",
  },
  sent: {
    label: "Sent",
    className: "bg-blue-500/10 text-blue-500",
  },
  replied: {
    label: "Replied",
    className: "bg-green-500/10 text-green-500",
  },
  no_response: {
    label: "No Response",
    className: "bg-amber-500/10 text-amber-500",
  },
  skipped: {
    label: "Skipped",
    className: "bg-slate-500/10 text-slate-500",
  },
};

const OUTREACH_STATUSES: TaskOutreachStatus[] = [
  "queued",
  "sent",
  "replied",
  "no_response",
  "skipped",
];

const ALL_VALUE = "__all__";

/* ─── types ─── */

interface OutreachKpis {
  totalOutreach: number;
  sentToday: number;
  responseRate: number;
  remaining: number;
}

/* ─── component ─── */

export function OutreachQueue() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showDone = searchParams.get("showDone") === "1";

  const toggleShowDone = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (showDone) {
      params.delete("showDone");
    } else {
      params.set("showDone", "1");
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams, showDone]);

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

  const outreachTasks = allTasks.filter(
    (t) =>
      t.task_type === "outreach" ||
      t.outreach_status != null ||
      t.tags?.some((tag) => tag.toLowerCase() === "outreach")
  );

  const kpis = useMemo<OutreachKpis>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const total = outreachTasks.length;
    const replied = outreachTasks.filter(
      (t) => t.outreach_status === "replied"
    ).length;
    const sentToday = outreachTasks.filter(
      (t) => t.sent_at?.slice(0, 10) === today
    ).length;
    const remaining = outreachTasks.filter(
      (t) => !t.outreach_status || t.outreach_status === "queued"
    ).length;
    return {
      totalOutreach: total,
      sentToday,
      responseRate: total > 0 ? Math.round((replied / total) * 100) : 0,
      remaining,
    };
  }, [outreachTasks]);

  const [search, setSearch] = useState("");
  const [filterOutreachStatus, setFilterOutreachStatus] = useState<string>(ALL_VALUE);
  const [filterTag, setFilterTag] = useState<string>(ALL_VALUE);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ─── outreach status counts ─── */

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { [ALL_VALUE]: outreachTasks.length };
    for (const s of OUTREACH_STATUSES) {
      counts[s] = 0;
    }
    for (const t of outreachTasks) {
      const os = t.outreach_status ?? "queued";
      counts[os] = (counts[os] ?? 0) + 1;
    }
    return counts;
  }, [outreachTasks]);

  /* ─── handlers ─── */

  const handleUpdateOutreachStatus = useCallback(
    async (task: TaskWithProject, outreachStatus: TaskOutreachStatus) => {
      const previous = queryClient.getQueryData<TaskWithProject[]>([
        "tasks",
        "list",
      ]);

      const sentAt =
        outreachStatus === "sent" ? new Date().toISOString() : task.sent_at;

      queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
        old?.map((t) =>
          t.id === task.id
            ? { ...t, outreach_status: outreachStatus, sent_at: sentAt }
            : t
        )
      );

      try {
        await updateTaskFields(task.id, {
          outreach_status: outreachStatus,
          ...(outreachStatus === "sent" ? { sent_at: sentAt } : {}),
        });
        toast.success(`Marked as ${OUTREACH_STATUS_CONFIG[outreachStatus].label}`);
      } catch {
        queryClient.setQueryData(["tasks", "list"], previous);
        toast.error("Failed to update outreach status");
      }
    },
    [queryClient]
  );

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
        await updateTaskStatus(task.id, newStatus);
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
        await deleteTask(task.id);
        toast.success("Task deleted");
      } catch {
        queryClient.setQueryData(["tasks", "list"], previous);
        toast.error("Failed to delete task");
      }
    },
    [queryClient]
  );

  const handleBatchStatus = useCallback(
    async (outreachStatus: TaskOutreachStatus) => {
      if (selectedIds.size === 0) return;

      const taskIds = Array.from(selectedIds);
      const previous = queryClient.getQueryData<TaskWithProject[]>([
        "tasks",
        "list",
      ]);

      const sentAt =
        outreachStatus === "sent" ? new Date().toISOString() : undefined;

      queryClient.setQueryData<TaskWithProject[]>(["tasks", "list"], (old) =>
        old?.map((t) =>
          selectedIds.has(t.id)
            ? {
                ...t,
                outreach_status: outreachStatus,
                ...(sentAt ? { sent_at: sentAt } : {}),
              }
            : t
        )
      );

      try {
        await batchUpdateOutreachStatus(taskIds, outreachStatus, sentAt);
        toast.success(
          `Updated ${taskIds.length} task${taskIds.length > 1 ? "s" : ""} to ${OUTREACH_STATUS_CONFIG[outreachStatus].label}`
        );
        setSelectedIds(new Set());
      } catch {
        queryClient.setQueryData(["tasks", "list"], previous);
        toast.error("Failed to batch update");
      }
    },
    [queryClient, selectedIds]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /* ─── filtering & sorting ─── */

  const filtered = outreachTasks.filter((t) => {
    if (!showDone && t.status === "done") return false;
    if (filterOutreachStatus !== ALL_VALUE) {
      const taskOs = t.outreach_status ?? "queued";
      if (taskOs !== filterOutreachStatus) return false;
    }
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

  const allVisibleSelected =
    sorted.length > 0 && sorted.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map((t) => t.id)));
    }
  }, [allVisibleSelected, sorted]);

  /* ─── tag options ─── */

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of outreachTasks) {
      for (const tag of t.tags ?? []) {
        const lower = tag.toLowerCase();
        if (SYSTEM_TAGS.includes(lower)) continue;
        counts[lower] = (counts[lower] ?? 0) + 1;
      }
    }
    return counts;
  }, [outreachTasks]);

  const uniqueTags = useMemo(
    () => Object.keys(tagCounts).sort((a, b) => a.localeCompare(b)),
    [tagCounts]
  );

  const totalTagCount = outreachTasks.filter((t) =>
    t.tags?.some((tag) => !SYSTEM_TAGS.includes(tag.toLowerCase()))
  ).length;

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

        <Select value={filterOutreachStatus} onValueChange={setFilterOutreachStatus}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>
              All Status ({statusCounts[ALL_VALUE]})
            </SelectItem>
            {OUTREACH_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {OUTREACH_STATUS_CONFIG[s].label} ({statusCounts[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTag} onValueChange={setFilterTag}>
          <SelectTrigger size="sm">
            <SelectValue placeholder="All Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Tags ({totalTagCount})</SelectItem>
            {uniqueTags.map((tag) => (
              <SelectItem key={tag} value={tag}>
                {tag.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} ({tagCounts[tag]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleShowDone}
          aria-pressed={showDone}
        >
          {showDone ? "Hide completed" : "Show completed"}
        </Button>
      </div>

      {/* Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-2.5">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2">
            {OUTREACH_STATUSES.map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => handleBatchStatus(s)}
              >
                {OUTREACH_STATUS_CONFIG[s].label}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto"
          >
            Clear
          </Button>
        </div>
      )}

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
                <th className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all visible tasks"
                  />
                </th>
                <th className="w-8 px-1 py-2.5" />
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Contact Name
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Company
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                  Status
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
                const linkedInUrl = getLinkedInUrl(task);
                const isExpanded = expandedId === task.id;
                const isDone = task.status === "done";

                return (
                  <OutreachRow
                    key={task.id}
                    task={task}
                    isDone={isDone}
                    isExpanded={isExpanded}
                    isSelected={selectedIds.has(task.id)}
                    linkedInUrl={linkedInUrl}
                    messagePreview={task.description ?? ""}
                    onToggleDone={() => handleToggleDone(task)}
                    onToggleExpand={() =>
                      setExpandedId(isExpanded ? null : task.id)
                    }
                    onDelete={() => handleDelete(task)}
                    onToggleSelect={() => toggleSelect(task.id)}
                    onUpdateOutreachStatus={(s) =>
                      handleUpdateOutreachStatus(task, s)
                    }
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

/* ─── status badge ─── */

function OutreachStatusBadge({
  status,
}: {
  status: TaskOutreachStatus;
}) {
  const config = OUTREACH_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

/* ─── row component ─── */

interface OutreachRowProps {
  task: TaskWithProject;
  isDone: boolean;
  isExpanded: boolean;
  isSelected: boolean;
  linkedInUrl: string | null;
  messagePreview: string;
  onToggleDone: () => void;
  onToggleExpand: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  onUpdateOutreachStatus: (status: TaskOutreachStatus) => void;
}

function OutreachRow({
  task,
  isDone,
  isExpanded,
  isSelected,
  linkedInUrl,
  messagePreview,
  onToggleDone,
  onToggleExpand,
  onDelete,
  onToggleSelect,
  onUpdateOutreachStatus,
}: OutreachRowProps) {
  const [copied, setCopied] = useState(false);
  const nonOutreachTags = (task.tags ?? []).filter(
    (tag) => !SYSTEM_TAGS.includes(tag.toLowerCase())
  );
  const outreachStatus: TaskOutreachStatus = task.outreach_status ?? "queued";

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

  const handleCopyAndMarkSent = useCallback(async () => {
    await handleCopy();
    if (outreachStatus === "queued") {
      onUpdateOutreachStatus("sent");
    }
  }, [handleCopy, outreachStatus, onUpdateOutreachStatus]);

  return (
    <>
      <tr
        className={cn(
          "border-b border-border transition-colors hover:bg-muted/30 cursor-pointer",
          isDone && "opacity-60",
          isSelected && "bg-primary/5"
        )}
        onClick={onToggleExpand}
      >
        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            aria-label={`Select "${task.title}"`}
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
          <span>{task.contacts?.name ?? task.title}</span>
          {task.contacts?.name && (
            <span className="block text-xs font-normal text-muted-foreground">
              {task.title}
            </span>
          )}
        </td>
        <td className="px-3 py-2.5 text-muted-foreground">
          {task.contacts?.company ?? task.assignee ?? "—"}
        </td>
        <td className="px-3 py-2.5">
          <OutreachStatusBadge status={outreachStatus} />
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
              title={linkedInUrl}
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

              {copied && outreachStatus === "queued" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => onUpdateOutreachStatus("sent")}
                      aria-label="Mark as Sent"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark as Sent</TooltipContent>
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
      {isExpanded && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={10} className="px-6 py-4">
            <div className="space-y-3">
              {messagePreview && (
                <>
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
                </>
              )}

              {/* Outreach status selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Outreach Status:
                </span>
                <div className="flex items-center gap-1.5">
                  {OUTREACH_STATUSES.map((s) => (
                    <Button
                      key={s}
                      variant={outreachStatus === s ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateOutreachStatus(s);
                      }}
                    >
                      {OUTREACH_STATUS_CONFIG[s].label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                {linkedInUrl && (
                  <Button size="sm" className="gap-1.5" asChild>
                    <a
                      href={linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-3.5" />
                      Open LinkedIn
                    </a>
                  </Button>
                )}
                {outreachStatus === "queued" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyAndMarkSent();
                    }}
                  >
                    <Send className="size-3.5" />
                    Copy & Mark as Sent
                  </Button>
                )}
                {outreachStatus !== "queued" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                    disabled={isDone}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDone();
                    }}
                  >
                    <Check className="size-3.5" />
                    Mark as Done
                  </Button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
