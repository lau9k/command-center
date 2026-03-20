"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Calendar,
  Clock,
  Tag,
  ExternalLink,
  Pencil,
  Trash2,
  Copy,
  Linkedin,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/components/dashboard/PriorityBadge";
import { ProjectBadge } from "@/components/dashboard/ProjectBadge";
import { ConfirmDeleteModal } from "@/components/dashboard/ConfirmDeleteModal";
import type { TaskWithProject, TaskStatus } from "@/lib/types/database";
import { statusBadgeClass } from "@/lib/design-tokens";
import { PersonizeContextPanel } from "@/components/dashboard/PersonizeContextPanel";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: statusBadgeClass.scheduled + " border-[#3B82F6]/20",
  in_progress: statusBadgeClass.ready + " border-[#EAB308]/20",
  done: statusBadgeClass.active + " border-[#22C55E]/20",
  blocked: statusBadgeClass.failed + " border-[#EF4444]/20",
};

const TASK_TYPE_LABELS: Record<string, string> = {
  general: "General",
  outreach: "Outreach",
  "follow-up": "Follow-up",
  "meeting-prep": "Meeting Prep",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface TaskDetailDrawerProps {
  task: TaskWithProject | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (task: TaskWithProject) => void;
  onDelete: (id: string) => void;
  /** Ordered list of task IDs in the current filtered view */
  taskIds?: string[];
  /** Called when user navigates to a different task */
  onNavigate?: (taskId: string) => void;
}

export function TaskDetailDrawer({
  task,
  open,
  onClose,
  onUpdate,
  onDelete,
  taskIds = [],
  onNavigate,
}: TaskDetailDrawerProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [badTasking, setBadTasking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentIndex = task ? taskIds.indexOf(task.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < taskIds.length - 1;

  const navigatePrev = useCallback(() => {
    if (hasPrev && onNavigate) {
      onNavigate(taskIds[currentIndex - 1]);
    }
  }, [hasPrev, onNavigate, taskIds, currentIndex]);

  const navigateNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(taskIds[currentIndex + 1]);
    }
  }, [hasNext, onNavigate, taskIds, currentIndex]);

  const advanceOrClose = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(taskIds[currentIndex + 1]);
    } else {
      onClose();
    }
  }, [hasNext, onNavigate, taskIds, currentIndex, onClose]);

  const handleMarkComplete = useCallback(async () => {
    if (!task) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" as TaskStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const { data } = await res.json();
      onUpdate(data);
      toast.success("Task completed");
      advanceOrClose();
    } catch {
      toast.error("Failed to mark task complete");
    } finally {
      setCompleting(false);
    }
  }, [task, onUpdate, advanceOrClose]);

  const handleBadTask = useCallback(async () => {
    if (!task) return;
    setBadTasking(true);
    try {
      const existingTags = task.tags ?? [];
      const tags = existingTags.includes("bad_task")
        ? existingTags
        : [...existingTags, "bad_task"];
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" as TaskStatus, tags }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const { data } = await res.json();
      onUpdate(data);
      toast.success("Marked as bad task");
      advanceOrClose();
    } catch {
      toast.error("Failed to mark as bad task");
    } finally {
      setBadTasking(false);
    }
  }, [task, onUpdate, advanceOrClose]);

  const handleDelete = useCallback(async () => {
    if (!task) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Task deleted");
      setDeleteOpen(false);
      onDelete(task.id);
      onClose();
    } catch {
      toast.error("Failed to delete task");
    } finally {
      setDeleting(false);
    }
  }, [task, onDelete, onClose]);

  const handleStartEdit = useCallback(() => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditing(true);
  }, [task]);

  const handleCancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const { data } = await res.json();
      onUpdate(data);
      setEditing(false);
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    } finally {
      setSaving(false);
    }
  }, [task, editTitle, editDescription, onUpdate]);

  const handleCopyMessage = useCallback(() => {
    if (!task?.description) return;
    navigator.clipboard.writeText(task.description);
    setCopied(true);
    toast.success("Message copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [task]);

  const handleOpenLinkedIn = useCallback(() => {
    if (!task?.contacts?.linkedin_url) return;
    window.open(task.contacts.linkedin_url, "_blank", "noopener,noreferrer");
  }, [task]);

  if (!task) return null;

  const isOutreach = task.task_type === "outreach";
  const isDone = task.status === "done";

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="bottom"
          className="max-h-[80vh] overflow-y-auto rounded-t-xl"
        >
          <SheetHeader>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {editing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-lg font-semibold"
                    autoFocus
                  />
                ) : (
                  <SheetTitle className={cn("text-lg", isDone && "line-through opacity-60")}>
                    {task.title}
                  </SheetTitle>
                )}
                <SheetDescription className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                      STATUS_COLORS[task.status]
                    )}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                  <PriorityBadge priority={task.priority} />
                  {task.projects && (
                    <ProjectBadge
                      name={task.projects.name}
                      color={task.projects.color}
                    />
                  )}
                  {task.task_type && task.task_type !== "general" && (
                    <Badge variant="secondary" className="text-xs">
                      {TASK_TYPE_LABELS[task.task_type] ?? task.task_type}
                    </Badge>
                  )}
                  {taskIds.length > 1 && currentIndex >= 0 && (
                    <span className="text-xs text-muted-foreground">
                      {currentIndex + 1} / {taskIds.length}
                    </span>
                  )}
                </SheetDescription>
              </div>

              {/* Navigation arrows */}
              {taskIds.length > 1 && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={navigatePrev}
                    disabled={!hasPrev}
                    aria-label="Previous task"
                  >
                    <ChevronLeft className="size-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={navigateNext}
                    disabled={!hasNext}
                    aria-label="Next task"
                  >
                    <ChevronRight className="size-5" />
                  </Button>
                </div>
              )}
            </div>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-6">
            {/* 2-column grid: Content left, Actions + Details right */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_280px]">
              {/* Left column: Description + Contact */}
              <div className="space-y-6">
                {/* Description */}
                {(task.description || editing) && (
                  editing ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={5}
                          className="resize-y"
                        />
                      </CardContent>
                    </Card>
                  ) : isOutreach ? (
                    <div>
                      <div className="mb-2 text-sm font-semibold">Outreach Message</div>
                      <div className="relative rounded-lg border bg-muted/50 dark:bg-zinc-900">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="absolute right-2 top-2"
                          onClick={handleCopyMessage}
                          aria-label={copied ? "Copied!" : "Copy message"}
                        >
                          {copied ? (
                            <Check className="size-3.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </Button>
                        <pre className="whitespace-pre-wrap p-4 pr-10 font-mono text-sm text-foreground">
                          {task.description}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      </CardContent>
                    </Card>
                  )
                )}

                {/* Contact Info (outreach tasks) */}
                {isOutreach && task.contacts && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">{task.contacts.name}</span>
                        {task.contacts.company && (
                          <span className="text-muted-foreground">
                            {" "}
                            at {task.contacts.company}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Personize Context (outreach tasks with contact) */}
                {isOutreach && task.contact_id && (
                  <PersonizeContextPanel contactId={task.contact_id} />
                )}

                {/* Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.due_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="text-muted-foreground">Due:</span>
                        <span className="text-foreground">
                          {format(new Date(task.due_date), "MMM d, yyyy")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Created:</span>
                      <span className="text-foreground">
                        {formatDate(task.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="text-foreground">
                        {formatDate(task.updated_at)}
                      </span>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Assignee:</span>
                        <span className="text-foreground">{task.assignee}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-1.5 text-sm">
                        <Tag className="size-3.5" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {task.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right column: Action buttons */}
              <div className="space-y-3">
                {editing ? (
                  <>
                    <Button
                      className="w-full gap-2"
                      onClick={handleSaveEdit}
                      disabled={saving}
                    >
                      <Check className="size-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleCancelEdit}
                    >
                      <X className="size-4" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    {!isDone && (
                      <Button
                        className="w-full gap-2"
                        onClick={handleMarkComplete}
                        disabled={completing}
                      >
                        <CheckCircle2 className="size-4" />
                        {completing ? "Completing..." : "Complete"}
                      </Button>
                    )}
                    {!isDone && (
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                        onClick={handleBadTask}
                        disabled={badTasking}
                      >
                        <ThumbsDown className="size-4" />
                        {badTasking ? "Marking..." : "Bad Task"}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleStartEdit}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    {task.external_url && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        asChild
                      >
                        <a
                          href={task.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-4" />
                          Open Link
                        </a>
                      </Button>
                    )}
                    {isOutreach && task.contacts?.linkedin_url && (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={handleOpenLinkedIn}
                      >
                        <Linkedin className="size-4" />
                        Open LinkedIn
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete task"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
