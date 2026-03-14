"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  Presentation,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Resource, ResourceType } from "@/lib/types/resources";

const FILE_TYPE_CONFIG: Record<
  ResourceType,
  { icon: typeof FileText; color: string; bg: string }
> = {
  pdf: { icon: FileText, color: "text-red-500", bg: "bg-red-500/10" },
  docx: { icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
  xlsx: { icon: FileSpreadsheet, color: "text-green-500", bg: "bg-green-500/10" },
  csv: { icon: FileSpreadsheet, color: "text-green-600", bg: "bg-green-600/10" },
  md: { icon: FileCode, color: "text-gray-500", bg: "bg-gray-500/10" },
  pptx: { icon: Presentation, color: "text-orange-500", bg: "bg-orange-500/10" },
  png: { icon: FileImage, color: "text-purple-500", bg: "bg-purple-500/10" },
  jpg: { icon: FileImage, color: "text-purple-400", bg: "bg-purple-400/10" },
  other: { icon: File, color: "text-muted-foreground", bg: "bg-muted/50" },
};

interface ResourceCardProps {
  resource: Resource;
  onClick: (resource: Resource) => void;
  view: "grid" | "list";
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ResourceCard({ resource, onClick, view }: ResourceCardProps) {
  const config = FILE_TYPE_CONFIG[resource.file_type] ?? FILE_TYPE_CONFIG.other;
  const Icon = config.icon;

  if (view === "list") {
    return (
      <div
        className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-all duration-150 hover:border-ring/50 hover:shadow-sm"
        onClick={() => onClick(resource)}
      >
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", config.bg)}>
          <Icon className={cn("size-5", config.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{resource.title}</p>
          {resource.description && (
            <p className="truncate text-xs text-muted-foreground">{resource.description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge variant="outline" className="text-xs uppercase">
            {resource.file_type}
          </Badge>
          {resource.file_size !== null && (
            <span className="text-xs text-muted-foreground">{formatFileSize(resource.file_size)}</span>
          )}
          <span className="text-xs text-muted-foreground">{formatDate(resource.created_at)}</span>
        </div>
      </div>
    );
  }

  return (
    <Card
      className="cursor-pointer transition-all duration-150 hover:border-ring/50 hover:shadow-md"
      onClick={() => onClick(resource)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className={cn("flex size-12 items-center justify-center rounded-lg", config.bg)}>
            <Icon className={cn("size-6", config.color)} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{resource.title}</p>
            {resource.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {resource.description}
              </p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs uppercase">
              {resource.file_type}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatDate(resource.created_at)}</span>
          </div>
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{resource.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
