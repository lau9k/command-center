"use client";

import { Search, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ResourceFilter } from "@/lib/types/resources";

const FILE_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "xlsx", label: "XLSX" },
  { value: "md", label: "Markdown" },
  { value: "pptx", label: "PPTX" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "csv", label: "CSV" },
  { value: "other", label: "Other" },
] as const;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A-Z" },
  { value: "type", label: "File type" },
] as const;

interface ResourceFiltersProps {
  filters: ResourceFilter;
  onFilterChange: (filters: Partial<ResourceFilter>) => void;
  view: "grid" | "list";
  onViewChange: (view: "grid" | "list") => void;
  projects: { id: string; name: string }[];
}

export function ResourceFilters({
  filters,
  onFilterChange,
  view,
  onViewChange,
  projects,
}: ResourceFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.fileType}
          onValueChange={(v) => onFilterChange({ fileType: v })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="File type" />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {projects.length > 0 && (
          <Select
            value={filters.projectId}
            onValueChange={(v) => onFilterChange({ projectId: v })}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.sort}
          onValueChange={(v) =>
            onFilterChange({ sort: v as ResourceFilter["sort"] })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        <Button
          variant="ghost"
          size="sm"
          className={cn("size-8 p-0", view === "grid" && "bg-accent")}
          onClick={() => onViewChange("grid")}
        >
          <LayoutGrid className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("size-8 p-0", view === "list" && "bg-accent")}
          onClick={() => onViewChange("list")}
        >
          <List className="size-4" />
        </Button>
      </div>
    </div>
  );
}
