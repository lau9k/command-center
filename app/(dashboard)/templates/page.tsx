"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Mail, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import type { EmailTemplate, EmailTemplateCategory } from "@/lib/types/database";

const CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  general: "General",
  outreach: "Outreach",
  follow_up: "Follow Up",
  introduction: "Introduction",
  proposal: "Proposal",
  thank_you: "Thank You",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/templates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      const { data } = await res.json();
      setTemplates(data ?? []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDelete = async (id: string) => {
    const prev = templates;
    setTemplates((t) => t.filter((tpl) => tpl.id !== id));

    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Template deleted");
    } catch {
      setTemplates(prev);
      toast.error("Failed to delete template");
    }
  };

  const handleSave = (saved: EmailTemplate) => {
    setTemplates((prev) => {
      const exists = prev.find((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [saved, ...prev];
    });
    toast.success(editingTemplate ? "Template updated" : "Template created");
  };

  const filtered = templates;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Email Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage reusable email templates with dynamic variables.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse p-4">
              <div className="h-5 w-2/3 rounded bg-muted" />
              <div className="mt-3 h-4 w-1/3 rounded bg-muted" />
              <div className="mt-4 space-y-2">
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Mail />}
          title="No templates yet"
          description="Create your first email template with dynamic variables like {{first_name}} to personalize outreach."
          actionLabel="Create Template"
          onAction={handleCreate}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className="group relative p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {template.name}
                  </h3>
                  <Badge variant="secondary" className="mt-1.5 text-xs">
                    {CATEGORY_LABELS[template.category]}
                  </Badge>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(template)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {template.subject && (
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  <span className="font-medium">Subject:</span> {template.subject}
                </p>
              )}

              {template.body && (
                <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                  {template.body}
                </p>
              )}

              {template.variables.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.variables.map((v) => (
                    <Badge key={v} variant="outline" className="text-[10px] px-1.5 py-0">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              )}

              <p className="mt-3 text-[10px] text-muted-foreground">
                Updated {new Date(template.updated_at).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
        onSave={handleSave}
      />
    </div>
  );
}
