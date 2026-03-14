"use client";

import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  FolderOpen,
  Search,
} from "lucide-react";
import type { Resource, ResourceFilter } from "@/lib/types/resources";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceFilters } from "@/components/resources/resource-filters";
import { ResourceDrawer } from "@/components/resources/resource-drawer";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { SharedEmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ResourceGridProps {
  initialResources: Resource[];
  projects: { id: string; name: string }[];
}

export function ResourceGrid({ initialResources, projects }: ResourceGridProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<ResourceFilter>({
    search: "",
    fileType: "all",
    projectId: "all",
    sort: "newest",
  });

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formFileType, setFormFileType] = useState("other");
  const [formProjectId, setFormProjectId] = useState("none");

  const filteredResources = useMemo(() => {
    let result = resources;

    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.fileType !== "all") {
      result = result.filter((r) => r.file_type === filters.fileType);
    }

    if (filters.projectId !== "all") {
      result = result.filter((r) => r.project_id === filters.projectId);
    }

    switch (filters.sort) {
      case "oldest":
        result = [...result].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        break;
      case "name":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "type":
        result = [...result].sort((a, b) => a.file_type.localeCompare(b.file_type));
        break;
      default:
        result = [...result].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }

    return result;
  }, [resources, filters]);

  const kpis = useMemo(() => {
    const total = resources.length;
    const byType = resources.reduce<Record<string, number>>((acc, r) => {
      acc[r.file_type] = (acc[r.file_type] ?? 0) + 1;
      return acc;
    }, {});
    const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
    const projectCount = new Set(resources.filter((r) => r.project_id).map((r) => r.project_id)).size;

    return { total, topType, projectCount };
  }, [resources]);

  const handleFilterChange = useCallback((partial: Partial<ResourceFilter>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleResourceUpdated = useCallback((updated: Resource) => {
    setResources((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedResource(updated);
  }, []);

  const handleResourceDeleted = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
    setSelectedResource(null);
  }, []);

  const resetForm = useCallback(() => {
    setFormTitle("");
    setFormDescription("");
    setFormFileUrl("");
    setFormFileType("other");
    setFormProjectId("none");
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          file_url: formFileUrl.trim() || null,
          file_type: formFileType,
          project_id: formProjectId === "none" ? null : formProjectId,
        }),
      });
      if (!res.ok) throw new Error("Failed to create resource");
      const { data } = await res.json();
      setResources((prev) => [data, ...prev]);
      setFormOpen(false);
      resetForm();
      toast.success("Resource created");
    } catch {
      toast.error("Failed to create resource");
    } finally {
      setCreating(false);
    }
  }, [formTitle, formDescription, formFileUrl, formFileType, formProjectId, resetForm]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Resources"
          value={kpis.total}
          icon={<FileText className="size-5" />}
        />
        <KpiCard
          label="Top File Type"
          value={kpis.topType ? kpis.topType[0].toUpperCase() : "—"}
          subtitle={kpis.topType ? `${kpis.topType[1]} files` : undefined}
          icon={<FolderOpen className="size-5" />}
        />
        <KpiCard
          label="Projects"
          value={kpis.projectCount}
          subtitle="with resources"
          icon={<Search className="size-5" />}
        />
      </div>

      {/* Filters + Add button */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <ResourceFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            view={view}
            onViewChange={setView}
            projects={projects}
          />
        </div>
        <Button className="gap-1.5" onClick={() => setFormOpen(true)}>
          <Plus className="size-4" />
          Add Resource
        </Button>
      </div>

      {/* Grid / List */}
      {filteredResources.length === 0 ? (
        <SharedEmptyState
          icon={<FileText />}
          title="No resources found"
          description={
            filters.search || filters.fileType !== "all" || filters.projectId !== "all"
              ? "Try adjusting your filters"
              : "Add your first resource to get started"
          }
          action={
            !filters.search && filters.fileType === "all"
              ? { label: "Add Resource", onClick: () => setFormOpen(true) }
              : undefined
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={setSelectedResource}
              view="grid"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={setSelectedResource}
              view="list"
            />
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      <ResourceDrawer
        resource={selectedResource}
        open={selectedResource !== null}
        onClose={() => setSelectedResource(null)}
        onResourceUpdated={handleResourceUpdated}
        onResourceDeleted={handleResourceDeleted}
      />

      {/* Create Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Resource</DialogTitle>
            <DialogDescription>Add a new document or file to your library.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title</label>
              <Input
                placeholder="Resource title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description</label>
              <Textarea
                placeholder="Optional description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">File URL</label>
              <Input
                placeholder="https://..."
                value={formFileUrl}
                onChange={(e) => setFormFileUrl(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">File Type</label>
                <Select value={formFileType} onValueChange={setFormFileType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                    <SelectItem value="md">Markdown</SelectItem>
                    <SelectItem value="pptx">PPTX</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpg">JPG</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Project</label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !formTitle.trim()}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
