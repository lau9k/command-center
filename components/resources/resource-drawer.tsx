"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  Presentation,
  File,
  Trash2,
  Archive,
  ExternalLink,
  Tag,
  Calendar,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDeleteModal } from "@/components/dashboard/ConfirmDeleteModal";
import type { Resource, ResourceType } from "@/lib/types/resources";

const FILE_TYPE_ICON: Record<ResourceType, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  xlsx: FileSpreadsheet,
  csv: FileSpreadsheet,
  md: FileCode,
  pptx: Presentation,
  png: FileImage,
  jpg: FileImage,
  other: File,
};

const FILE_TYPE_COLOR: Record<ResourceType, string> = {
  pdf: "text-red-500",
  docx: "text-blue-500",
  xlsx: "text-green-500",
  csv: "text-green-600",
  md: "text-gray-500",
  pptx: "text-orange-500",
  png: "text-purple-500",
  jpg: "text-purple-400",
  other: "text-muted-foreground",
};

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ResourceDrawerProps {
  resource: Resource | null;
  open: boolean;
  onClose: () => void;
  onResourceUpdated: (updated: Resource) => void;
  onResourceDeleted: (id: string) => void;
}

export function ResourceDrawer({
  resource,
  open,
  onClose,
  onResourceUpdated,
  onResourceDeleted,
}: ResourceDrawerProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const patchResource = useCallback(
    async (field: string, value: string | string[]) => {
      if (!resource) return;
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const { data } = await res.json();
      onResourceUpdated(data);
      toast.success("Resource updated");
    },
    [resource, onResourceUpdated]
  );

  const handleDelete = useCallback(async () => {
    if (!resource) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Resource deleted");
      setDeleteOpen(false);
      onResourceDeleted(resource.id);
      onClose();
    } catch {
      toast.error("Failed to delete resource");
    } finally {
      setDeleting(false);
    }
  }, [resource, onResourceDeleted, onClose]);

  const handleArchive = useCallback(async () => {
    if (!resource) return;
    setArchiving(true);
    try {
      await patchResource("status", "archived");
    } catch {
      toast.error("Failed to archive resource");
    } finally {
      setArchiving(false);
    }
  }, [resource, patchResource]);

  if (!resource) return null;

  const Icon = FILE_TYPE_ICON[resource.file_type] ?? FILE_TYPE_ICON.other;
  const iconColor = FILE_TYPE_COLOR[resource.file_type] ?? FILE_TYPE_COLOR.other;

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-lg"
        >
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                <Icon className={cn("size-7", iconColor)} />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="truncate">{resource.title}</SheetTitle>
                <SheetDescription className="truncate uppercase">
                  {resource.file_type} {resource.file_size !== null ? `· ${formatFileSize(resource.file_size)}` : ""}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6 px-4 pb-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              {resource.file_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  asChild
                >
                  <a href={resource.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5" />
                    Open
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleArchive}
                disabled={archiving || resource.status === "archived"}
              >
                <Archive className="size-3.5" />
                {archiving ? "Archiving..." : "Archive"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>

            {/* Description */}
            {resource.description && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {resource.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* File Preview */}
            {resource.file_url && resource.file_type === "pdf" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <iframe
                    src={resource.file_url}
                    className="h-80 w-full rounded border border-border"
                    title={`Preview of ${resource.title}`}
                  />
                </CardContent>
              </Card>
            )}

            {resource.file_url && (resource.file_type === "png" || resource.file_type === "jpg") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resource.file_url}
                    alt={resource.title}
                    className="max-h-80 w-full rounded border border-border object-contain"
                  />
                </CardContent>
              </Card>
            )}

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <HardDrive className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Size:</span>
                  <span className="text-foreground">{formatFileSize(resource.file_size)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-foreground">{formatDate(resource.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="text-foreground">{formatDate(resource.updated_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                  >
                    {resource.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-sm">
                  <Tag className="size-3.5" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resource.tags && resource.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {resource.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tags</p>
                )}
              </CardContent>
            </Card>

            <Separator />
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDeleteModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Resource"
        description={`Are you sure you want to delete "${resource.title}"? This cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </>
  );
}
