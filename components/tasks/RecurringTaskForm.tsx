"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskPriority, TaskWithProject } from "@/lib/types/database";

interface ProjectOption {
  id: string;
  name: string;
  color: string | null;
}

interface RecurringFormData {
  title: string;
  description: string;
  recurrence_rule: string;
  project_id: string;
  priority: TaskPriority;
}

interface RecurringTaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithProject | null;
  projects: ProjectOption[];
  onSubmit: () => void;
}

const FREQUENCY_OPTIONS = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Mon\u2013Fri", value: "weekdays" },
  { label: "Monthly", value: "monthly" },
];

const emptyForm: RecurringFormData = {
  title: "",
  description: "",
  recurrence_rule: "weekly",
  project_id: "",
  priority: "medium",
};

export function RecurringTaskForm({
  open,
  onOpenChange,
  task,
  projects,
  onSubmit,
}: RecurringTaskFormProps) {
  const [form, setForm] = useState<RecurringFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const isEditing = !!task;

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        recurrence_rule: task.recurrence_rule ?? "weekly",
        project_id: task.project_id ?? "",
        priority: task.priority,
      });
    } else {
      setForm(emptyForm);
    }
  }, [task, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        recurrence_rule: form.recurrence_rule,
        project_id: form.project_id || null,
        priority: form.priority,
        is_recurring_template: true,
        status: "todo" as const,
      };

      const url = isEditing
        ? `/api/tasks/recurring/${task.id}`
        : "/api/tasks/recurring";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSubmit();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Recurring Task" : "New Recurring Task"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="recurring-title">Title</Label>
            <Input
              id="recurring-title"
              required
              placeholder="Task title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recurring-description">Description</Label>
            <Textarea
              id="recurring-description"
              placeholder="Optional description"
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select
                value={form.recurrence_rule}
                onValueChange={(v) =>
                  setForm({ ...form, recurrence_rule: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v as TaskPriority })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Project</Label>
            <Select
              value={form.project_id}
              onValueChange={(v) => setForm({ ...form, project_id: v })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {isEditing ? "Save Changes" : "Create Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
