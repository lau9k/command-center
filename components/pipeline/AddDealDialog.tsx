"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { PipelineStage } from "./StageColumn";
import type { PipelineItemData } from "./DealCard";

interface DealFormData {
  title: string;
  company: string;
  deal_value: string;
  stage_id: string;
  owner: string;
  close_date: string | null;
  notes: string;
}

interface AddDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  pipelineId: string;
  projectId?: string;
  projects?: { id: string; name: string }[];
  onDealCreated: (item: PipelineItemData) => void;
}

const emptyForm: DealFormData = {
  title: "",
  company: "",
  deal_value: "",
  stage_id: "",
  owner: "",
  close_date: null,
  notes: "",
};

export function AddDealDialog({
  open,
  onOpenChange,
  stages,
  pipelineId,
  projectId,
  projects = [],
  onDealCreated,
}: AddDealDialogProps) {
  const [form, setForm] = useState<DealFormData>(emptyForm);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedProjectId = projectId ?? selectedProjectId;

  function resetForm() {
    setForm({ ...emptyForm, stage_id: stages[0]?.id ?? "" });
    setSelectedProjectId("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const stageId = form.stage_id || stages[0]?.id;
    if (!stageId) return;

    if (!resolvedProjectId) {
      setError("Please select a project");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const metadata: Record<string, unknown> = {};
      if (form.company.trim()) metadata.company = form.company.trim();
      if (form.deal_value.trim()) {
        const num = parseFloat(form.deal_value.replace(/[$,\s]/g, ""));
        if (!isNaN(num)) metadata.deal_value = num;
      }
      if (form.owner.trim()) metadata.owner = form.owner.trim();
      if (form.close_date) metadata.close_date = form.close_date;
      if (form.notes.trim()) metadata.notes = form.notes.trim();

      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          pipeline_id: pipelineId,
          stage_id: stageId,
          project_id: resolvedProjectId,
          entity_type: "deal",
          sort_order: 0,
          metadata,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create deal");
        return;
      }

      const newItem: PipelineItemData = await res.json();
      onDealCreated(newItem);
      resetForm();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Deal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="deal-title">Title</Label>
            <Input
              id="deal-title"
              required
              placeholder="Deal name"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="deal-company">Company</Label>
              <Input
                id="deal-company"
                placeholder="Company name"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-value">Value</Label>
              <Input
                id="deal-value"
                placeholder="$10,000"
                value={form.deal_value}
                onChange={(e) => setForm({ ...form, deal_value: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Stage</Label>
              <Select
                value={form.stage_id || stages[0]?.id}
                onValueChange={(v) => setForm({ ...form, stage_id: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deal-owner">Owner</Label>
              <Input
                id="deal-owner"
                placeholder="Deal owner"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
          </div>

          {!projectId && projects.length > 0 && (
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
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
          )}

          <div className="grid gap-2">
            <Label>Close Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.close_date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="size-4" />
                  {form.close_date
                    ? format(new Date(form.close_date), "MMM d, yyyy")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.close_date ? new Date(form.close_date) : undefined}
                  onSelect={(date) =>
                    setForm({
                      ...form,
                      close_date: date ? format(date, "yyyy-MM-dd") : null,
                    })
                  }
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deal-notes">Notes</Label>
            <Textarea
              id="deal-notes"
              placeholder="Additional notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim() || !resolvedProjectId}>
              {saving ? "Creating..." : "Create Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
