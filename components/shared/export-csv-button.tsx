"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV, buildExportUrl } from "@/lib/csv-export";
import type { FilterCondition } from "@/lib/filters";
import type { ExportModule } from "@/components/shared/export-configs";

interface ExportCsvButtonProps {
  module: ExportModule;
  filters?: FilterCondition[];
  label?: string;
}

export function ExportCsvButton({
  module,
  filters,
  label = "Export CSV",
}: ExportCsvButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const url = buildExportUrl(module, filters);
      const res = await fetch(url);

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: "Export failed" }));
        throw new Error(
          body.error ?? `Export failed (${res.status})`
        );
      }

      const csv = await res.text();
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `${module}-export-${dateStr}.csv`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Export failed";
      alert(message);
    } finally {
      setLoading(false);
    }
  }, [module, filters]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {label}
    </Button>
  );
}
