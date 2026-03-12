"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { EmailTemplate, EmailTemplateCategory } from "@/lib/types/database";

const CATEGORIES: { value: EmailTemplateCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "outreach", label: "Outreach" },
  { value: "follow_up", label: "Follow Up" },
  { value: "introduction", label: "Introduction" },
  { value: "proposal", label: "Proposal" },
  { value: "thank_you", label: "Thank You" },
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

function renderPreview(template: string, variables: string[]): string {
  let result = template;
  for (const v of variables) {
    const regex = new RegExp(`\\{\\{${v}\\}\\}`, "g");
    result = result.replace(
      regex,
      `<span class="rounded bg-sidebar-primary/20 px-1 text-sidebar-primary font-medium">${v}</span>`
    );
  }
  return result;
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
  const [activeTab, setActiveTab] = useState("edit");

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
    setActiveTab("edit");
  }, [template, open]);

  const detectedVars = detectVariables(`${form.subject} ${form.body}`);

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
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Template" : "New Template"}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
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

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="edit">Edit</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Hi {{first_name}}, quick follow-up"
                  value={form.subject}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subject: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  placeholder="Write your email template here. Use {{variable_name}} for dynamic values."
                  rows={12}
                  value={form.body}
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
            </TabsContent>

            <TabsContent value="preview" className="pt-4">
              <div className="rounded-lg border border-border bg-background p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Subject
                  </p>
                  <p
                    className="text-sm font-medium text-foreground"
                    dangerouslySetInnerHTML={{
                      __html: renderPreview(form.subject, detectedVars) || "<span class='text-muted-foreground italic'>No subject</span>",
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Body
                  </p>
                  <div
                    className="whitespace-pre-wrap text-sm text-foreground"
                    dangerouslySetInnerHTML={{
                      __html: renderPreview(form.body, detectedVars) || "<span class='text-muted-foreground italic'>No body content</span>",
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || saving}
              className="flex-1"
            >
              {saving ? "Saving..." : isEditing ? "Update Template" : "Create Template"}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
