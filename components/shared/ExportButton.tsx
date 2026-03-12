"use client";

import { useState, useCallback } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV } from "@/lib/export";

interface ExportButtonProps {
  table: string;
  label?: string;
}

export function ExportButton({ table, label = "Export CSV" }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?table=${encodeURIComponent(table)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Export failed" }));
        throw new Error(body.error ?? "Export failed");
      }
      const csv = await res.text();
      const filename = `${table}-export-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csv, filename);
    } catch (err) {
      // Surface error via alert — avoids adding toast dependency
      const message = err instanceof Error ? err.message : "Export failed";
      alert(message);
    } finally {
      setLoading(false);
    }
  }, [table]);

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
