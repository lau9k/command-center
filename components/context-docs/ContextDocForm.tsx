"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { ContextDoc, ContextDocType } from "@/lib/personize/context-docs";
import { CONTEXT_DOC_TYPES } from "@/lib/personize/context-docs";

interface ContextDocFormProps {
  doc?: ContextDoc;
  defaultType?: ContextDocType;
}

const TYPE_LABELS: Record<ContextDocType, string> = {
  guideline: "Guideline",
  playbook: "Playbook",
  reference: "Reference",
  template: "Template",
  brief: "Brief",
};

export function ContextDocForm({ doc, defaultType }: ContextDocFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState<ContextDocType>(
    doc?.type ?? defaultType ?? "guideline"
  );
  const [title, setTitle] = useState(doc?.title ?? "");
  const [content, setContent] = useState(doc?.content ?? "");
  const [tagsInput, setTagsInput] = useState(doc?.tags.join(", ") ?? "");

  const isEdit = !!doc;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        ...(doc?.id ? { id: doc.id } : {}),
        type,
        title: title.trim(),
        content: content.trim(),
        tags,
      };

      const res = await fetch("/api/context-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Save failed" }));
        toast.error((data as { error?: string }).error ?? "Save failed");
        return;
      }

      const result = (await res.json()) as { doc: ContextDoc };
      toast.success(isEdit ? "Context doc updated" : "Context doc created");

      startTransition(() => {
        if (isEdit) {
          router.refresh();
        } else {
          router.push(`/context-docs/${result.doc.id}`);
        }
      });
    } catch {
      toast.error("Failed to save context doc");
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving || isPending;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select
          value={type}
          onValueChange={(v) => setType(v as ContextDocType)}
          disabled={isEdit}
        >
          <SelectTrigger id="type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTEXT_DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Sales Follow-up Playbook"
          disabled={disabled}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content (Markdown)</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your doc content here..."
          rows={16}
          className="font-mono text-sm"
          disabled={disabled}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. outreach, sales, priority"
          disabled={disabled}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={disabled}>
          {saving && <Loader2 className="mr-1 size-4 animate-spin" />}
          {isEdit ? "Save Changes" : "Create Doc"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={disabled}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
