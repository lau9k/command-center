"use client";

import { useState, useMemo, useCallback } from "react";
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
import { AddResourceDialog } from "@/components/add-resource-dialog";

interface ResourceGridProps {
  initialResources: Resource[];
  projects: { id: string; name: string }[];
}

export function ResourceGrid({ initialResources, projects }: ResourceGridProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [formOpen, setFormOpen] = useState(false);
  const [filters, setFilters] = useState<ResourceFilter>({
    search: "",
    fileType: "all",
    projectId: "all",
    sort: "newest",
  });


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

  const handleResourceCreated = useCallback((resource: Resource) => {
    setResources((prev) => [resource, ...prev]);
  }, []);

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
      <AddResourceDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        projects={projects}
        onResourceCreated={handleResourceCreated}
      />
    </div>
  );
}
