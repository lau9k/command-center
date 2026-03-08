"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  X,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const PERSONIZE_FIELDS = [
  { value: "first_name", label: "First Name" },
  { value: "last_name", label: "Last Name" },
  { value: "email", label: "Email" },
  { value: "job_title", label: "Job Title" },
  { value: "company_name", label: "Company Name" },
  { value: "linkedin_url", label: "LinkedIn URL" },
  { value: "website", label: "Website" },
  { value: "phone", label: "Phone" },
  { value: "industry", label: "Industry" },
  { value: "city", label: "City" },
  { value: "country", label: "Country" },
] as const;

const SKIP_VALUE = "__skip__";

type Step = 1 | 2 | 3 | 4;

interface ImportResult {
  id: string;
  record_count: number;
  status: string;
}

function guessMapping(csvHeader: string): string {
  const normalized = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const field of PERSONIZE_FIELDS) {
    const fieldNorm = field.value.replace(/_/g, "");
    const labelNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === fieldNorm || normalized === labelNorm) return field.value;
    if (normalized.includes(fieldNorm) || fieldNorm.includes(normalized))
      return field.value;
  }
  return SKIP_VALUE;
}

const STEP_LABELS = ["Upload CSV", "Map Columns", "Preview", "Import"];

export default function ImportPage() {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {}
  );
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        setCsvHeaders(headers);
        setAllRows(results.data);
        setCsvRows(results.data.slice(0, 5));

        const mapping: Record<string, string> = {};
        for (const h of headers) {
          mapping[h] = guessMapping(h);
        }
        setColumnMapping(mapping);
        setStep(2);
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
    setCsvHeaders([]);
    setCsvRows([]);
    setAllRows([]);
    setColumnMapping({});
    setImportResult(null);
    setStep(1);
  }

  function setMapping(csvCol: string, dbField: string) {
    setColumnMapping((prev) => ({ ...prev, [csvCol]: dbField }));
  }

  const activeMappedFields = useMemo(
    () => Object.values(columnMapping).filter((v) => v !== SKIP_VALUE),
    [columnMapping]
  );

  const previewMappedRows = useMemo(() => {
    const activeMappings = Object.entries(columnMapping).filter(
      ([, v]) => v !== SKIP_VALUE
    );
    return csvRows.map((row) => {
      const mapped: Record<string, string | null> = {};
      for (const [csvCol, dbField] of activeMappings) {
        const val = row[csvCol]?.trim();
        mapped[dbField] = val || null;
      }
      return mapped;
    });
  }, [csvRows, columnMapping]);

  function buildMappedRows(): Record<string, string | null>[] {
    const activeMappings = Object.entries(columnMapping).filter(
      ([, v]) => v !== SKIP_VALUE
    );
    return allRows.map((row) => {
      const mapped: Record<string, string | null> = {};
      for (const [csvCol, dbField] of activeMappings) {
        const val = row[csvCol]?.trim();
        mapped[dbField] = val || null;
      }
      return mapped;
    });
  }

  async function executeImport() {
    setImporting(true);
    setStep(4);

    try {
      const mappedRows = buildMappedRows();
      const fieldMappingConfig: Record<string, string> = {};
      for (const [csvCol, dbField] of Object.entries(columnMapping)) {
        if (dbField !== SKIP_VALUE) {
          fieldMappingConfig[csvCol] = dbField;
        }
      }

      const response = await fetch("/api/import/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file!.name,
          mapped_data: mappedRows,
          field_mapping: fieldMappingConfig,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import failed");
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      toast.success(`Imported ${result.record_count} contacts`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setStep(3);
    } finally {
      setImporting(false);
    }
  }

  const hasFile = file !== null && csvHeaders.length > 0;
  const hasMappings = activeMappedFields.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to import contacts for Personize enrichment.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isComplete = step > stepNum || (step === 4 && !!importResult);
          return (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-8 ${
                    isComplete ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : isComplete
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isActive
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Drag and drop a CSV file or click to browse.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your CSV file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .csv files
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
          </CardContent>
        </Card>
      )}

      {/* File summary (shown on steps 2-4) */}
      {hasFile && step >= 2 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {allRows.length} rows, {csvHeaders.length} columns
              </p>
            </div>
          </div>
          {!importing && !importResult && (
            <Button variant="ghost" size="icon" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && hasFile && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map each CSV column to a Personize field, or skip it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {csvHeaders.map((header) => (
                <div key={header} className="flex items-center gap-4">
                  <div className="w-1/3 truncate text-sm font-medium">
                    {header}
                  </div>
                  <span className="text-muted-foreground">&rarr;</span>
                  <div className="w-1/3">
                    <Select
                      value={columnMapping[header] ?? SKIP_VALUE}
                      onValueChange={(v) => setMapping(header, v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SKIP_VALUE}>-- Skip --</SelectItem>
                        {PERSONIZE_FIELDS.map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-1/4 truncate text-xs text-muted-foreground">
                    {csvRows[0]?.[header] ?? ""}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={clearFile}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!hasMappings}
              >
                Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 3 && hasFile && hasMappings && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Showing first {previewMappedRows.length} of {allRows.length} rows
              with mapped columns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {activeMappedFields.map((field) => (
                      <TableHead key={field}>
                        {PERSONIZE_FIELDS.find((f) => f.value === field)
                          ?.label ?? field}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewMappedRows.map((row, i) => (
                    <TableRow key={i}>
                      {activeMappedFields.map((field) => (
                        <TableCell key={field}>
                          {row[field] ?? "\u2014"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={executeImport}>
                Import {allRows.length} Contacts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Importing / Results */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {importing ? "Importing..." : "Import Complete"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {importing && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Saving {allRows.length} contacts to Supabase...
                </p>
              </div>
            )}

            {importResult && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                  <p className="text-lg font-medium">Import Successful</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {importResult.record_count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Records Imported
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {activeMappedFields.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Fields Mapped
                      </p>
                    </div>
                    <div>
                      <Badge variant="secondary">{importResult.status}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Status
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={clearFile}>
                    Import Another File
                  </Button>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button disabled>
                            <Send className="mr-2 h-4 w-4" />
                            Send to Personize
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Personize API integration coming soon
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
