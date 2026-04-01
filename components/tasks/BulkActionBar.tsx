"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkDeleteDialog } from "./BulkDeleteDialog";
import type { TaskStatus, TaskPriority } from "@/lib/types/database";
import {
  bulkUpdateTasks,
  bulkDeleteTasks,
} from "@/lib/actions/tasks";

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  onBulkUpdate: () => void;
}

export function BulkActionBar({
  selectedIds,
  onClear,
  onBulkUpdate,
}: BulkActionBarProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);

  const count = selectedIds.size;
  if (count === 0) return null;

  const ids = Array.from(selectedIds);

  async function handleStatusChange(status: TaskStatus) {
    setUpdating(true);
    const result = await bulkUpdateTasks(ids, { status });
    if (result.success && result.data) {
      toast.success(`Updated status for ${result.data.length} task${result.data.length !== 1 ? "s" : ""}`);
      onBulkUpdate();
      onClear();
    } else {
      toast.error(result.error ?? "Failed to update tasks — try again");
    }
    setUpdating(false);
  }

  async function handlePriorityChange(priority: TaskPriority) {
    setUpdating(true);
    const result = await bulkUpdateTasks(ids, { priority });
    if (result.success && result.data) {
      toast.success(`Updated priority for ${result.data.length} task${result.data.length !== 1 ? "s" : ""}`);
      onBulkUpdate();
      onClear();
    } else {
      toast.error(result.error ?? "Failed to update tasks — try again");
    }
    setUpdating(false);
  }

  async function handleBulkDelete() {
    setDeleting(true);
    const result = await bulkDeleteTasks(ids);
    if (result.success) {
      toast.success(`Deleted ${count} task${count !== 1 ? "s" : ""}`);
      setDeleteOpen(false);
      onBulkUpdate();
      onClear();
    } else {
      toast.error(result.error ?? "Failed to delete tasks — try again");
    }
    setDeleting(false);
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-200">
        <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-2.5 shadow-lg">
          <span className="text-sm font-medium tabular-nums">
            {count} selected
          </span>

          <div className="h-5 w-px bg-border" />

          <Select
            value=""
            onValueChange={(v) => handleStatusChange(v as TaskStatus)}
            disabled={updating}
          >
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value=""
            onValueChange={(v) => handlePriorityChange(v as TaskPriority)}
            disabled={updating}
          >
            <SelectTrigger size="sm" className="w-[130px]">
              <SelectValue placeholder="Set priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-5 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            disabled={updating}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1 size-4" />
            Delete
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClear}
            aria-label="Clear selection"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <BulkDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        count={count}
        onConfirm={handleBulkDelete}
        loading={deleting}
      />
    </>
  );
}
