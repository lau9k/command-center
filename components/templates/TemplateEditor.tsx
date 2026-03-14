"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import type { EmailTemplate, EmailTemplateCategory } from "@/lib/types/database";

const CATEGORIES: { value: EmailTemplateCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "outreach", label: "Outreach" },
  { value: "follow_up", label: "Follow Up" },
  { value: "introduction", label: "Introduction" },
  { value: "proposal", label: "Proposal" },
  { value: "thank_you", label: "Thank You" },
];

const TEMPLATE_VARIABLES = [
  "sponsor_name",
  "event_name",
  "tier",
  "benefits",
  "contact_name",
  "company",
  "date",
];

interface FormData {
  name: string;
  subject: string;
  body: string;
  category: EmailTemplateCategory;
}

const EMPTY_FORM: FormData = {
  name: "",
  subject: "",
  body: "",
  category: "general",
};

function detectVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}

interface TemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: EmailTemplate | null;
  onSave: (template: EmailTemplate) => void;
}

export function TemplateEditor({
  open,
  onOpenChange,
  template,
  onSave,
}: TemplateEditorProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name,
        subject: template.subject,
        body: template.body,
        category: template.category,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [template, open]);

  const detectedVars = detectVariables(`${form.subject} ${form.body}`);

  const insertVariable = useCallback(
    (variable: string) => {
      const insertion = `{{${variable}}}`;
      const field = activeField;
      const ref = field === "subject" ? subjectRef.current : bodyRef.current;

      if (ref) {
        const start = ref.selectionStart ?? ref.value.length;
        const end = ref.selectionEnd ?? start;
        const value = ref.value;
        const newValue = value.slice(0, start) + insertion + value.slice(end);

        setForm((f) => ({ ...f, [field]: newValue }));

        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          const newPos = start + insertion.length;
          ref.setSelectionRange(newPos, newPos);
          ref.focus();
        });
      } else {
        setForm((f) => ({ ...f, [field]: f[field] + insertion }));
      }
    },
    [activeField]
  );

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) return;
    setSaving(true);

    try {
      const url = isEditing ? `/api/templates/${template.id}` : "/api/templates";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save template");

      const { data } = await res.json();
      onSave(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, template, onSave, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Template" : "New Template"}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g. Welcome Email"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, category: v as EmailTemplateCategory }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Editor */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Insert Variable</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => insertVariable(v)}
                    >
                      {`{{${v}}}`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  ref={subjectRef}
                  placeholder="e.g. Hi {{contact_name}}, quick follow-up"
                  value={form.subject}
                  onFocus={() => setActiveField("subject")}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  ref={bodyRef}
                  placeholder="Write your email template here. Use {{variable_name}} for dynamic values."
                  rows={14}
                  value={form.body}
                  onFocus={() => setActiveField("body")}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, body: e.target.value }))
                  }
                />
              </div>

              {detectedVars.length > 0 && (
                <div className="space-y-2">
                  <Label>Detected Variables</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedVars.map((v) => (
                      <Badge key={v} variant="secondary">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Preview */}
            <div className="space-y-2">
              <Label>Live Preview</Label>
              <TemplatePreview subject={form.subject} body={form.body} />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              className="flex-1"
            >
              {saving ? "Saving..." : isEditing ? "Update Template" : "Create Template"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
