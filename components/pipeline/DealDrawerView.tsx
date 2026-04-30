"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  DollarSign,
  Building2,
  User,
  Calendar,
  FileText,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealNextActionEditor } from "./DealNextActionEditor";
import { DealPrimaryContacts } from "./DealPrimaryContacts";
import { DealConversationFeed } from "./DealConversationFeed";
import type { PipelineItemData } from "./DealCard";
import type { PipelineStage } from "./StageColumn";

interface DrawerForm {
  company: string;
  value: string;
  close_date: string;
  contact_name: string;
  probability: string;
  notes: string;
  stage_id: string;
}

function initDrawerForm(item: PipelineItemData): DrawerForm {
  const meta = item.metadata ?? {};
  return {
    company: String(meta.company ?? ""),
    value: meta.value !== undefined && meta.value !== null ? String(meta.value) : "",
    close_date: String(meta.close_date ?? ""),
    contact_name: String(meta.contact_name ?? meta.contact ?? ""),
    probability: String(meta.probability ?? ""),
    notes: String(meta.notes ?? ""),
    stage_id: item.stage_id,
  };
}

function readPrimaryContactIds(meta: Record<string, unknown>): string[] {
  if (Array.isArray(meta.primary_contacts)) {
    return (meta.primary_contacts as unknown[]).filter(
      (s): s is string => typeof s === "string"
    );
  }
  if (Array.isArray(meta.contact_ids)) {
    return (meta.contact_ids as unknown[]).filter(
      (s): s is string => typeof s === "string"
    );
  }
  return [];
}

interface Props {
  item: PipelineItemData;
  stages: PipelineStage[];
  onDelete: (id: string) => void;
  onSave: (
    id: string,
    metadata: Record<string, unknown>,
    stageId: string
  ) => Promise<void>;
  onStageChange: (
    itemId: string,
    newStageId: string,
    newIndex: number
  ) => Promise<void>;
}

export function DealDrawerView({
  item,
  stages,
  onDelete,
  onSave,
  onStageChange,
}: Props) {
  const [form, setForm] = useState<DrawerForm>(() => initDrawerForm(item));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initDrawerForm(item));
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = item.metadata ?? {};
  const nextAction =
    typeof meta.next_action === "string" ? meta.next_action : undefined;
  const nextActionDue =
    typeof meta.next_action_due === "string" ? meta.next_action_due : undefined;
  const primaryContactIds = readPrimaryContactIds(meta);

  const currentStage = stages.find((s) => s.id === form.stage_id) ?? null;

  const hasChanges = useMemo(() => {
    const original = initDrawerForm(item);
    return (Object.keys(original) as (keyof DrawerForm)[]).some(
      (key) => form[key] !== original[key]
    );
  }, [form, item]);

  const handleNextActionUpdate = useCallback(
    async (na: string, naDue: string | null) => {
      const newMeta: Record<string, unknown> = { ...(item.metadata ?? {}) };
      if (na) newMeta.next_action = na;
      else delete newMeta.next_action;
      if (naDue) newMeta.next_action_due = naDue;
      else delete newMeta.next_action_due;
      await onSave(item.id, newMeta, item.stage_id);
    },
    [item, onSave]
  );

  const handlePrimaryContactsUpdate = useCallback(
    async (ids: string[]) => {
      const newMeta: Record<string, unknown> = { ...(item.metadata ?? {}) };
      newMeta.primary_contacts = ids;
      await onSave(item.id, newMeta, item.stage_id);
    },
    [item, onSave]
  );

  function updateField(field: keyof DrawerForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSaveDetails() {
    setSaving(true);
    try {
      const newMeta: Record<string, unknown> = { ...(item.metadata ?? {}) };
      newMeta.company = form.company.trim() || undefined;
      const parsedValue = parseFloat(form.value.replace(/[$,\s]/g, ""));
      newMeta.value = !isNaN(parsedValue) && form.value.trim() ? parsedValue : undefined;
      newMeta.close_date = form.close_date.trim() || undefined;
      newMeta.contact_name = form.contact_name.trim() || undefined;
      newMeta.probability = form.probability.trim() || undefined;
      newMeta.notes = form.notes.trim() || undefined;

      for (const key of Object.keys(newMeta)) {
        if (newMeta[key] === undefined) delete newMeta[key];
      }

      if (form.stage_id !== item.stage_id) {
        await onStageChange(item.id, form.stage_id, 0);
      }
      await onSave(item.id, newMeta, form.stage_id);
    } finally {
      setSaving(false);
    }
  }

  const fieldLabelClass =
    "mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground";
  const inputClass =
    "w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="flex flex-col gap-5">
      {/* 1. NEXT ACTION (top, prominent) */}
      <DealNextActionEditor
        nextAction={nextAction}
        nextActionDue={nextActionDue}
        onUpdate={handleNextActionUpdate}
      />

      {/* 2. PRIMARY CONTACTS */}
      <DealPrimaryContacts
        contactIds={primaryContactIds}
        onUpdate={handlePrimaryContactsUpdate}
      />

      {/* 3. CONVERSATION HISTORY */}
      <DealConversationFeed dealId={item.id} contactIds={primaryContactIds} />

      {/* 4. EDIT DEAL DETAILS (collapsed accordion) */}
      <details className="group rounded-md border border-border bg-card">
        <summary className="cursor-pointer select-none list-none px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/50 [&::-webkit-details-marker]:hidden">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">
            ›
          </span>
          Edit deal details
        </summary>
        <div className="space-y-4 border-t border-border p-3">
          <div>
            <h4 className={fieldLabelClass}>Stage</h4>
            <div className="flex items-center gap-2">
              {currentStage && (
                <span
                  className="inline-block size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: currentStage.color ?? "#6B7280" }}
                />
              )}
              <select
                value={form.stage_id}
                onChange={(e) => updateField("stage_id", e.target.value)}
                className={inputClass}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <h4 className={fieldLabelClass}>Deal Value</h4>
            <div className="flex items-center gap-1.5">
              <DollarSign className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={form.value}
                onChange={(e) => updateField("value", e.target.value)}
                placeholder="10000"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <h4 className={fieldLabelClass}>Company</h4>
            <div className="flex items-center gap-1.5">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={form.company}
                onChange={(e) => updateField("company", e.target.value)}
                placeholder="Company name"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <h4 className={fieldLabelClass}>Contact</h4>
            <div className="flex items-center gap-1.5">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => updateField("contact_name", e.target.value)}
                placeholder="Contact name"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <h4 className={fieldLabelClass}>Close Date</h4>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="date"
                value={form.close_date}
                onChange={(e) => updateField("close_date", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <h4 className={fieldLabelClass}>Probability</h4>
            <input
              type="text"
              value={form.probability}
              onChange={(e) => updateField("probability", e.target.value)}
              placeholder="e.g. 75%"
              className={inputClass}
            />
          </div>

          <div>
            <h4 className={fieldLabelClass}>Notes</h4>
            <div className="flex items-start gap-1.5">
              <FileText className="mt-2 size-4 shrink-0 text-muted-foreground" />
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className={inputClass + " resize-y"}
              />
            </div>
          </div>

          {hasChanges && (
            <Button
              onClick={handleSaveDetails}
              disabled={saving}
              size="sm"
              className="w-full"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}

          <div className="border-t border-border pt-3">
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>
                Created {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
              <span>
                Updated {format(new Date(item.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(item.id)}
            >
              Delete deal
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}
