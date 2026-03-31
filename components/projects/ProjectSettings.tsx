"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronDown, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

/** Tailwind-aligned hex values used in inline styles (color swatch backgroundColor) */
const COLOR_PALETTE = [
  { label: "Blue", value: "#3B82F6" }, // blue-500
  { label: "Purple", value: "#8B5CF6" }, // violet-500
  { label: "Green", value: "#22C55E" }, // green-500
  { label: "Orange", value: "#F97316" }, // orange-500
  { label: "Red", value: "#EF4444" }, // red-500
  { label: "Pink", value: "#EC4899" }, // pink-500
  { label: "Teal", value: "#14B8A6" }, // teal-500
  { label: "Yellow", value: "#EAB308" }, // yellow-500
  { label: "Gray", value: "#6B7280" }, // gray-500
];

const STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "Planned", value: "planned" },
  { label: "Paused", value: "paused" },
  { label: "Archived", value: "archived" },
];

interface ProjectSettingsProps {
  projectId: string;
  initialName: string;
  initialDescription: string | null;
  initialStatus: string;
  initialColor: string | null;
}

export function ProjectSettings({
  projectId,
  initialName,
  initialDescription,
  initialStatus,
  initialColor,
}: ProjectSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [status, setStatus] = useState(initialStatus);
  const [color, setColor] = useState(initialColor ?? "#3B82F6");

  const hasChanges =
    name !== initialName ||
    description !== (initialDescription ?? "") ||
    status !== initialStatus ||
    color !== (initialColor ?? "#3B82F6");

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
          color,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to update project");
        return;
      }

      toast.success("Project updated");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(force: boolean) {
    setDeleting(true);
    try {
      const url = force
        ? `/api/projects/${projectId}?force=true`
        : `/api/projects/${projectId}`;

      const res = await fetch(url, { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) {
          const details = data.details;
          const items: string[] = [];
          if (details?.tasks) items.push(`${details.tasks} task(s)`);
          if (details?.pipeline_items) items.push(`${details.pipeline_items} pipeline item(s)`);
          toast.error(`Project has ${items.join(" and ")}. Use force delete to remove everything.`);
          return;
        }
        toast.error(data.error ?? "Failed to delete project");
        return;
      }

      toast.success("Project deleted");
      router.push("/projects");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-6 py-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Project description"
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className={`size-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c.value
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{initialName}&rdquo; and all
                    associated tasks and pipeline items. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(true)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={handleSave} disabled={saving || !hasChanges || !name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
