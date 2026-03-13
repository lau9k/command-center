"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";

// ── Types ────────────────────────────────────────────────

export type GovernanceCategory =
  | "brand_voice"
  | "icp_definition"
  | "outreach_playbook"
  | "competitor_policy"
  | "custom";

export interface GovernanceVariable {
  id: string;
  name: string;
  content: string;
  triggerKeywords: string[];
  category: GovernanceCategory;
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceFormData {
  name: string;
  content: string;
  triggerKeywords: string[];
  category: GovernanceCategory;
}

interface GovernanceEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: GovernanceVariable | null;
  onSave: (data: GovernanceFormData) => Promise<void>;
}

// ── Category labels ──────────────────────────────────────

const CATEGORY_LABELS: Record<GovernanceCategory, string> = {
  brand_voice: "Brand Voice",
  icp_definition: "ICP Definition",
  outreach_playbook: "Outreach Playbook",
  competitor_policy: "Competitor Policy",
  custom: "Custom",
};

// ── Component ────────────────────────────────────────────

export function GovernanceEditor({
  open,
  onOpenChange,
  variable,
  onSave,
}: GovernanceEditorProps) {
  const [name, setName] = useState(variable?.name ?? "");
  const [content, setContent] = useState(variable?.content ?? "");
  const [category, setCategory] = useState<GovernanceCategory>(
    variable?.category ?? "custom"
  );
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>(
    variable?.triggerKeywords ?? []
  );
  const [keywordInput, setKeywordInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset form when variable changes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setName(variable?.name ?? "");
        setContent(variable?.content ?? "");
        setCategory(variable?.category ?? "custom");
        setTriggerKeywords(variable?.triggerKeywords ?? []);
        setKeywordInput("");
      }
      onOpenChange(nextOpen);
    },
    [variable, onOpenChange]
  );

  const addKeyword = useCallback(() => {
    const trimmed = keywordInput.trim();
    if (trimmed && !triggerKeywords.includes(trimmed)) {
      setTriggerKeywords((prev) => [...prev, trimmed]);
    }
    setKeywordInput("");
  }, [keywordInput, triggerKeywords]);

  const removeKeyword = useCallback((keyword: string) => {
    setTriggerKeywords((prev) => prev.filter((k) => k !== keyword));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addKeyword();
      }
    },
    [addKeyword]
  );

  const handleSave = useCallback(async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), content: content.trim(), triggerKeywords, category });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [name, content, triggerKeywords, category, onSave, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {variable ? "Edit Governance Variable" : "New Governance Variable"}
          </DialogTitle>
          <DialogDescription>
            Define guidelines that Personize will use when generating content and
            recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="gov-name"
              className="text-sm font-medium text-foreground"
            >
              Name
            </label>
            <Input
              id="gov-name"
              placeholder="e.g. Brand Voice Guidelines"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label
              htmlFor="gov-category"
              className="text-sm font-medium text-foreground"
            >
              Category
            </label>
            <select
              id="gov-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as GovernanceCategory)
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label
              htmlFor="gov-content"
              className="text-sm font-medium text-foreground"
            >
              Content{" "}
              <span className="text-muted-foreground font-normal">
                (Markdown supported)
              </span>
            </label>
            <Textarea
              id="gov-content"
              placeholder="Write your governance guidelines here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Trigger Keywords */}
          <div className="space-y-1.5">
            <label
              htmlFor="gov-keywords"
              className="text-sm font-medium text-foreground"
            >
              Trigger Keywords
            </label>
            <p className="text-xs text-muted-foreground">
              Keywords that will activate this governance variable in
              smartGuidelines. Press Enter or comma to add.
            </p>
            <div className="flex gap-2">
              <Input
                id="gov-keywords"
                placeholder="Add keyword..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKeyword}
                disabled={!keywordInput.trim()}
              >
                Add
              </Button>
            </div>
            {triggerKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {triggerKeywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => removeKeyword(kw)}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remove ${kw}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !content.trim()}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {variable ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
