"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitMerge, Loader2 } from "lucide-react";

interface ContactData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  source: string;
  status: string;
  tags: string[];
  score: number;
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
  updated_at: string;
}

interface MergeContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactA: ContactData;
  contactB: ContactData;
  onMerged: () => void;
}

const MERGE_FIELDS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
] as const;

type FieldKey = (typeof MERGE_FIELDS)[number]["key"];

export function MergeContactDialog({
  open,
  onOpenChange,
  contactA,
  contactB,
  onMerged,
}: MergeContactDialogProps) {
  // Default: pick the winner as contact A (older record) for each field
  const [selections, setSelections] = useState<Record<FieldKey, "A" | "B">>(() => {
    const initial: Record<string, "A" | "B"> = {};
    for (const f of MERGE_FIELDS) {
      initial[f.key] = "A";
    }
    return initial as Record<FieldKey, "A" | "B">;
  });
  const [merging, setMerging] = useState(false);

  const handleSelect = useCallback((field: FieldKey, side: "A" | "B") => {
    setSelections((prev) => ({ ...prev, [field]: side }));
  }, []);

  const handleMerge = useCallback(async () => {
    setMerging(true);
    try {
      // Build field overrides from selections
      const fieldOverrides: Record<string, string | number | string[] | null> = {};
      for (const f of MERGE_FIELDS) {
        const source = selections[f.key] === "A" ? contactA : contactB;
        const value = source[f.key as keyof ContactData];
        if (value !== undefined) {
          fieldOverrides[f.key] = value as string | number | string[] | null;
        }
      }

      const res = await fetch("/api/contacts/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: contactA.id,
          loserId: contactB.id,
          fieldOverrides,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Merge failed");
      }

      toast.success(`Merged "${contactB.name}" into "${contactA.name}"`);
      onOpenChange(false);
      onMerged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  }, [selections, contactA, contactB, onOpenChange, onMerged]);

  const getValue = (contact: ContactData, key: string): string => {
    const val = contact[key as keyof ContactData];
    if (val === null || val === undefined) return "—";
    if (Array.isArray(val)) return val.join(", ") || "—";
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="size-5" />
            Merge Contacts
          </DialogTitle>
          <DialogDescription>
            Choose which value to keep for each field. Contact B will be
            soft-deleted after merge.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          {/* Header row */}
          <div className="grid grid-cols-[120px_1fr_1fr] gap-2 border-b border-border pb-2 text-xs font-medium text-muted-foreground">
            <div>Field</div>
            <div className="flex items-center gap-1.5">
              Contact A
              <Badge variant="secondary" className="text-[10px]">
                keep
              </Badge>
            </div>
            <div>Contact B</div>
          </div>

          {/* Field rows */}
          {MERGE_FIELDS.map((field) => {
            const valA = getValue(contactA, field.key);
            const valB = getValue(contactB, field.key);
            const isDifferent = valA !== valB;
            const selectedSide = selections[field.key];

            return (
              <div
                key={field.key}
                className={`grid grid-cols-[120px_1fr_1fr] gap-2 rounded-md py-1.5 ${
                  isDifferent ? "" : "opacity-60"
                }`}
              >
                <div className="text-sm font-medium text-muted-foreground self-center">
                  {field.label}
                </div>
                <button
                  type="button"
                  onClick={() => isDifferent && handleSelect(field.key, "A")}
                  disabled={!isDifferent}
                  className={`rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                    selectedSide === "A"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  } ${!isDifferent ? "cursor-default" : "cursor-pointer"}`}
                >
                  {valA}
                </button>
                <button
                  type="button"
                  onClick={() => isDifferent && handleSelect(field.key, "B")}
                  disabled={!isDifferent}
                  className={`rounded-md border px-3 py-1.5 text-left text-sm transition-colors ${
                    selectedSide === "B"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:border-muted-foreground/30"
                  } ${!isDifferent ? "cursor-default" : "cursor-pointer"}`}
                >
                  {valB}
                </button>
              </div>
            );
          })}
        </div>

        {/* Tags merge info */}
        <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
          Tags, notes, and score will be merged automatically (union of tags,
          concatenated notes, higher score wins).
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={merging}
          >
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={merging} className="gap-1.5">
            {merging ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <GitMerge className="size-4" />
            )}
            {merging ? "Merging..." : "Merge Contacts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
