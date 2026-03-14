/**
 * CSV export utilities — RFC 4180 compliant.
 */

/** Escape a cell value per RFC 4180: wrap in quotes if it contains comma, quote, or newline. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Generate a CSV string from an array of objects. Uses keys of the first row as headers. */
export function generateCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCell).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h])).join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}

/** Generate a CSV string from rows, filtered to only the specified columns. */
export function generateFilteredCSV(
  rows: Record<string, unknown>[],
  columns: string[]
): string {
  if (rows.length === 0 || columns.length === 0) return "";

  const headerLine = columns.map(escapeCell).join(",");
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCell(row[col])).join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}

/** Generate a printable HTML document with a styled table for PDF export. */
export function generatePDFHTML(
  rows: Record<string, unknown>[],
  columns: string[],
  title: string
): string {
  const formatHeader = (key: string): string =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const escapeHTML = (val: unknown): string => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  const headerCells = columns
    .map((col) => `<th>${escapeHTML(formatHeader(col))}</th>`)
    .join("");

  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${columns.map((col) => `<td>${escapeHTML(row[col])}</td>`).join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHTML(title)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { font-size: 12px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  tr:nth-child(even) { background: #fafafa; }
  @media print {
    body { padding: 0; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<h1>${escapeHTML(title)}</h1>
<p class="meta">Exported on ${new Date().toLocaleDateString()} &bull; ${rows.length} records</p>
<table>
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`;
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
