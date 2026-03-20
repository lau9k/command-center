"use client";

import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

type FieldKey = "date" | "description" | "amount" | "type";

const REQUIRED_FIELDS: { key: FieldKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
  { key: "type", label: "Type (optional)" },
];

interface BankFormat {
  name: string;
  mapping: Partial<Record<FieldKey, string>>;
}

const BANK_FORMATS: BankFormat[] = [
  {
    name: "TD Bank",
    mapping: {
      date: "Date",
      description: "Description",
      amount: "Withdrawals",
    },
  },
  {
    name: "RBC",
    mapping: {
      date: "Date",
      description: "Description",
      amount: "Amount",
    },
  },
];

function detectBankFormat(headers: string[]): Partial<Record<FieldKey, string>> | null {
  const headerSet = new Set(headers.map((h) => h.toLowerCase().trim()));

  for (const format of BANK_FORMATS) {
    const mappingValues = Object.values(format.mapping);
    const matchCount = mappingValues.filter((v) =>
      headerSet.has(v.toLowerCase())
    ).length;
    if (matchCount >= mappingValues.length) {
      return format.mapping;
    }
  }

  // Generic auto-detect
  const mapping: Partial<Record<FieldKey, string>> = {};
  for (const h of headers) {
    const lower = h.toLowerCase().trim();
    if (!mapping.date && (lower === "date" || lower === "transaction date" || lower === "posted date")) {
      mapping.date = h;
    }
    if (!mapping.description && (lower === "description" || lower === "memo" || lower === "details" || lower === "transaction" || lower === "name")) {
      mapping.description = h;
    }
    if (!mapping.amount && (lower === "amount" || lower === "withdrawals" || lower === "debit" || lower === "value")) {
      mapping.amount = h;
    }
    if (!mapping.type && (lower === "type" || lower === "transaction type")) {
      mapping.type = h;
    }
  }

  if (mapping.date && mapping.description && mapping.amount) {
    return mapping;
  }

  return null;
}

interface TransactionImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

export function TransactionImport({
  open,
  onOpenChange,
  onImportComplete,
}: TransactionImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setResult(null);
    setFile(f);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const h = results.meta.fields ?? [];
        setHeaders(h);
        setAllRows(results.data);
        setPreviewRows(results.data.slice(0, 5));

        // Auto-detect column mapping
        const detected = detectBankFormat(h);
        if (detected) {
          setColumnMapping(detected);
        }
      },
      error() {
        toast.error("Failed to parse CSV file");
      },
    });
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith(".csv")) {
      handleFile(f);
    } else {
      toast.error("Please upload a CSV file");
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function clearFile() {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setAllRows([]);
    setColumnMapping({});
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateMapping(field: FieldKey, csvColumn: string) {
    setColumnMapping((prev) => ({
      ...prev,
      [field]: csvColumn === "__none__" ? undefined : csvColumn,
    }));
  }

  const canImport =
    columnMapping.date && columnMapping.description && columnMapping.amount;

  async function executeImport() {
    if (allRows.length === 0 || !canImport) return;
    setImporting(true);
    setResult(null);

    try {
      // Map rows using column mapping
      const mappedRows = allRows.map((row) => {
        const amount = row[columnMapping.amount!] ?? "";
        // Check for deposits column (TD format has separate Withdrawals/Deposits)
        const depositCol = headers.find(
          (h) => h.toLowerCase() === "deposits"
        );
        const depositVal = depositCol ? row[depositCol] : "";

        let parsedAmount = amount;
        let inferredType: string | undefined;

        if (depositVal && parseFloat(depositVal.replace(/[,$]/g, "")) > 0) {
          parsedAmount = depositVal;
          inferredType = "income";
        } else if (amount) {
          const num = parseFloat(amount.replace(/[,$]/g, ""));
          inferredType = num < 0 ? "expense" : "income";
          parsedAmount = amount;
        }

        const typeCol = columnMapping.type ? row[columnMapping.type] : undefined;
        const type = typeCol
          ? typeCol.toLowerCase().includes("income")
            ? "income"
            : "expense"
          : inferredType;

        return {
          date: row[columnMapping.date!] ?? "",
          description: row[columnMapping.description!] ?? "",
          amount: parsedAmount,
          type,
        };
      });

      const response = await fetch("/api/finance/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import failed");
      }

      const data: ImportResult = await response.json();
      setResult(data);

      if (data.errors.length === 0) {
        toast.success(`Imported ${data.imported} transactions`);
      } else {
        toast.warning(
          `Imported ${data.imported}, ${data.errors.length} errors`
        );
      }

      if (data.imported > 0) {
        onImportComplete();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setImporting(false);
    }
  }

  const hasFile = file !== null && headers.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!importing) {
          onOpenChange(v);
          if (!v) clearFile();
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Upload a bank statement CSV to bulk-import transactions. Supports TD,
            RBC, and generic formats.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Drop zone */}
          {!hasFile && (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <Upload className="size-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop CSV here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .csv bank statement exports
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          )}

          {/* File info */}
          {hasFile && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="size-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {allRows.length} rows, {headers.length} columns
                  </p>
                </div>
              </div>
              {!importing && (
                <Button variant="ghost" size="icon" onClick={clearFile}>
                  <X className="size-4" />
                </Button>
              )}
            </div>
          )}

          {/* Column mapping */}
          {hasFile && !result && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Column Mapping</p>
              <div className="grid grid-cols-2 gap-3">
                {REQUIRED_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      {field.label}
                    </label>
                    <Select
                      value={columnMapping[field.key] ?? "__none__"}
                      onValueChange={(v) => updateMapping(field.key, v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Not mapped --</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview table */}
          {hasFile && previewRows.length > 0 && !result && (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.map((h) => (
                      <TableHead key={h} className="whitespace-nowrap text-xs">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {headers.map((h) => (
                        <TableCell
                          key={h}
                          className="max-w-[200px] truncate text-xs"
                        >
                          {row[h] || "\u2014"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {allRows.length > 5 && (
                <p className="px-4 py-2 text-xs text-muted-foreground">
                  Showing 5 of {allRows.length} rows
                </p>
              )}
            </div>
          )}

          {/* Import button */}
          {hasFile && !result && (
            <Button
              onClick={executeImport}
              disabled={importing || !canImport}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Importing {allRows.length} transactions...
                </>
              ) : (
                <>Import {allRows.length} Transactions</>
              )}
            </Button>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {result.errors.length === 0 ? (
                  <CheckCircle2 className="size-5 text-green-500" />
                ) : (
                  <AlertCircle className="size-5 text-yellow-500" />
                )}
                <span className="font-medium">Import Complete</span>
              </div>

              <div className="flex gap-4">
                <div className="rounded-lg border px-4 py-2 text-center">
                  <p className="text-xl font-bold text-green-600">
                    {result.imported}
                  </p>
                  <p className="text-xs text-muted-foreground">Imported</p>
                </div>
                <div className="rounded-lg border px-4 py-2 text-center">
                  <p className="text-xl font-bold text-muted-foreground">
                    {result.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="rounded-lg border px-4 py-2 text-center">
                  <p className="text-xl font-bold text-red-600">
                    {result.errors.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Errors</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <p className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">
                    Errors
                  </p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <p
                        key={i}
                        className="text-xs text-red-700 dark:text-red-300"
                      >
                        {err}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <Button variant="outline" onClick={clearFile} size="sm">
                Import Another File
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
