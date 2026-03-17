/**
 * CSV export utilities — RFC 4180 compliant with Excel BOM support.
 */

import type { FilterCondition } from "@/lib/filters";

/** Escape a cell value per RFC 4180. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str =
    typeof value === "object" ? JSON.stringify(value) : String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumnConfig {
  key: string;
  header: string;
  format?: (value: unknown) => string;
}

/**
 * Generate a CSV string from rows using column configs with custom headers
 * and optional formatters. Includes UTF-8 BOM for Excel compatibility.
 */
export function generateCSV(
  columns: CsvColumnConfig[],
  rows: Record<string, unknown>[]
): string {
  if (rows.length === 0) return "";

  const bom = "\uFEFF";
  const headerLine = columns.map((c) => escapeCell(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const formatted = col.format ? col.format(raw) : raw;
        return escapeCell(formatted);
      })
      .join(",")
  );

  return bom + [headerLine, ...dataLines].join("\r\n");
}

/** Trigger a browser download of the given CSV string. */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Build the export API URL with module and optional filters. */
export function buildExportUrl(
  module: string,
  filters?: FilterCondition[]
): string {
  const params = new URLSearchParams({ module });
  if (filters && filters.length > 0) {
    params.set("filters", JSON.stringify(filters));
  }
  return `/api/export?${params.toString()}`;
}
