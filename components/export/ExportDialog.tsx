"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCSV } from "@/lib/export";

type EntityType =
  | "contacts"
  | "tasks"
  | "sponsors"
  | "content_posts"
  | "pipeline_items";

type ExportFormat = "csv" | "pdf";

interface ColumnDef {
  key: string;
  label: string;
}

const ENTITY_COLUMNS: Record<EntityType, ColumnDef[]> = {
  contacts: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "company", label: "Company" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
    { key: "source", label: "Source" },
    { key: "score", label: "Score" },
    { key: "tags", label: "Tags" },
    { key: "last_contact_date", label: "Last Contact" },
    { key: "created_at", label: "Created At" },
  ],
  tasks: [
    { key: "title", label: "Title" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status" },
    { key: "priority", label: "Priority" },
    { key: "due_date", label: "Due Date" },
    { key: "assignee", label: "Assignee" },
    { key: "tags", label: "Tags" },
    { key: "created_at", label: "Created At" },
  ],
  sponsors: [
    { key: "name", label: "Name" },
    { key: "contact_name", label: "Contact Name" },
    { key: "contact_email", label: "Contact Email" },
    { key: "company_url", label: "Company URL" },
    { key: "tier", label: "Tier" },
    { key: "status", label: "Status" },
    { key: "amount", label: "Amount" },
    { key: "currency", label: "Currency" },
    { key: "notes", label: "Notes" },
    { key: "created_at", label: "Created At" },
  ],
  content_posts: [
    { key: "title", label: "Title" },
    { key: "body", label: "Body" },
    { key: "platform", label: "Platform" },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "scheduled_for", label: "Scheduled For" },
    { key: "published_at", label: "Published At" },
    { key: "created_at", label: "Created At" },
  ],
  pipeline_items: [
    { key: "title", label: "Title" },
    { key: "entity_type", label: "Entity Type" },
    { key: "stage_id", label: "Stage" },
    { key: "sort_order", label: "Sort Order" },
    { key: "created_at", label: "Created At" },
    { key: "updated_at", label: "Updated At" },
  ],
};

const ENTITY_LABELS: Record<EntityType, string> = {
  contacts: "Contacts",
  tasks: "Tasks",
  sponsors: "Sponsors",
  content_posts: "Content Posts",
  pipeline_items: "Pipeline Deals",
};

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: EntityType;
}

export function ExportDialog({
  open,
  onOpenChange,
  entityType,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    () => new Set(ENTITY_COLUMNS[entityType].map((c) => c.key))
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  const columns = ENTITY_COLUMNS[entityType];

  const toggleColumn = useCallback((key: string) => {
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedColumns((prev) => {
      if (prev.size === columns.length) {
        return new Set<string>();
      }
      return new Set(columns.map((c) => c.key));
    });
  }, [columns]);

  const handleExport = useCallback(async () => {
    if (selectedColumns.size === 0) {
      toast.error("Select at least one column to export");
      return;
    }

    setLoading(true);
    try {
      const body = {
        entity_type: entityType,
        format,
        columns: Array.from(selectedColumns),
        date_range:
          dateFrom || dateTo
            ? { from: dateFrom || undefined, to: dateTo || undefined }
            : undefined,
      };

      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(err.error ?? "Export failed");
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `${entityType}-export-${dateStr}`;

      if (format === "csv") {
        const csv = await res.text();
        downloadCSV(csv, `${filename}.csv`);
      } else {
        const html = await res.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, "_blank");
        if (printWindow) {
          printWindow.addEventListener("afterprint", () => {
            URL.revokeObjectURL(url);
          });
        }
      }

      toast.success(
        `${ENTITY_LABELS[entityType]} exported as ${format.toUpperCase()}`
      );
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [entityType, format, selectedColumns, dateFrom, dateTo, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export {ENTITY_LABELS[entityType]}</DialogTitle>
          <DialogDescription>
            Choose format, columns, and optional date range.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format selector */}
          <div className="space-y-2">
            <Label>Format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as ExportFormat)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Column selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Columns</Label>
              <Button
                variant="ghost"
                size="xs"
                onClick={toggleAll}
                type="button"
              >
                {selectedColumns.size === columns.length
                  ? "Deselect all"
                  : "Select all"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-md border p-3 max-h-48 overflow-y-auto">
              {columns.map((col) => (
                <label
                  key={col.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selectedColumns.has(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div className="space-y-2">
            <Label>Date Range (optional)</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { EntityType };
