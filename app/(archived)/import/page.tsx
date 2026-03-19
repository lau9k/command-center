"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Send,
  AlertCircle,
  Users,
  FileText,
  ListTodo,
  Kanban,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ImportProgress } from "@/components/import/import-progress";
import { ImportDropzone } from "@/components/dashboard/ImportDropzone";
import {
  ColumnMapper,
  type FieldDefinition,
} from "@/components/dashboard/ColumnMapper";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Module configs
// ---------------------------------------------------------------------------

type Module = "contacts" | "content" | "tasks" | "pipeline";

interface ModuleConfig {
  label: string;
  description: string;
  icon: React.ReactNode;
  fields: FieldDefinition[];
}

const MODULE_CONFIGS: Record<Module, ModuleConfig> = {
  contacts: {
    label: "Contacts",
    description: "Import contacts with email-based duplicate detection",
    icon: <Users className="h-5 w-5" />,
    fields: [
      { value: "name", label: "Name" },
      { value: "first_name", label: "First Name" },
      { value: "last_name", label: "Last Name" },
      { value: "email", label: "Email", required: true },
      { value: "company_name", label: "Company Name" },
      { value: "job_title", label: "Job Title" },
      { value: "linkedin_url", label: "LinkedIn URL" },
      { value: "website", label: "Website" },
      { value: "phone", label: "Phone" },
      { value: "industry", label: "Industry" },
      { value: "city", label: "City" },
      { value: "country", label: "Country" },
      { value: "source", label: "Source" },
    ],
  },
  content: {
    label: "Content",
    description: "Import content posts with title-based duplicate detection",
    icon: <FileText className="h-5 w-5" />,
    fields: [
      { value: "title", label: "Title", required: true },
      { value: "caption", label: "Caption / Body" },
      { value: "platform", label: "Platform" },
      { value: "content_type", label: "Content Type" },
      { value: "tone", label: "Tone" },
      { value: "status", label: "Status" },
      { value: "scheduled_at", label: "Scheduled Date" },
      { value: "week_of", label: "Week Of" },
    ],
  },
  tasks: {
    label: "Tasks",
    description: "Import tasks with title-based duplicate detection",
    icon: <ListTodo className="h-5 w-5" />,
    fields: [
      { value: "title", label: "Title", required: true },
      { value: "description", label: "Description" },
      { value: "status", label: "Status" },
      { value: "priority", label: "Priority" },
      { value: "due_date", label: "Due Date" },
      { value: "assignee", label: "Assignee" },
    ],
  },
  pipeline: {
    label: "Pipeline",
    description: "Import pipeline deals with title-based duplicate detection",
    icon: <Kanban className="h-5 w-5" />,
    fields: [
      { value: "title", label: "Deal Name", required: true },
      { value: "company", label: "Company" },
      { value: "value", label: "Deal Value" },
      { value: "probability", label: "Probability" },
      { value: "notes", label: "Notes" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const SKIP_VALUE = "__skip__";

type Step = 1 | 2 | 3 | 4 | 5;

interface RowResult {
  row: number;
  status: "imported" | "updated" | "skipped";
  reason?: string;
}

interface ImportResponse {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  results: RowResult[];
}

interface PersonizeProgress {
  total: number;
  processed: number;
  errors: number;
  status: string;
}

interface PersonizeResult {
  imported: number;
  errors: number;
  details: { index: number; email: string | null; error: string }[];
}

// ---------------------------------------------------------------------------
// Auto-mapping helper
// ---------------------------------------------------------------------------

function guessMapping(csvHeader: string, fields: FieldDefinition[]): string {
  const normalized = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const field of fields) {
    const fieldNorm = field.value.replace(/_/g, "");
    const labelNorm = field.label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === fieldNorm || normalized === labelNorm) return field.value;
    if (normalized.includes(fieldNorm) || fieldNorm.includes(normalized))
      return field.value;
  }
  return SKIP_VALUE;
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS = [
  "Module",
  "Upload CSV",
  "Map Columns",
  "Preview",
  "Import",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const searchParams = useSearchParams();
  const preselectedModule = searchParams.get("module") as Module | null;
  const validModules: Module[] = ["contacts", "content", "tasks", "pipeline"];
  const initialModule = preselectedModule && validModules.includes(preselectedModule) ? preselectedModule : null;

  const [step, setStep] = useState<Step>(initialModule ? 2 : 1);
  const [selectedModule, setSelectedModule] = useState<Module | null>(initialModule);
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {}
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResponse, setImportResponse] = useState<ImportResponse | null>(
    null
  );

  // Personize state (contacts only)
  const [personizeSending, setPersonizeSending] = useState(false);
  const [personizeProgress, setPersonizeProgress] =
    useState<PersonizeProgress | null>(null);
  const [personizeResult, setPersonizeResult] =
    useState<PersonizeResult | null>(null);
  const [personizeImportId, setPersonizeImportId] = useState<string | null>(
    null
  );
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // File handling
  // ---------------------------------------------------------------------------

  const handleFile = useCallback(
    (f: File) => {
      if (!selectedModule) return;
      setFile(f);
      Papa.parse<Record<string, string>>(f, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          const headers = results.meta.fields ?? [];
          setCsvHeaders(headers);
          setAllRows(results.data);
          setCsvRows(results.data.slice(0, 5));

          const fields = MODULE_CONFIGS[selectedModule].fields;
          const mapping: Record<string, string> = {};
          for (const h of headers) {
            mapping[h] = guessMapping(h, fields);
          }
          setColumnMapping(mapping);
          setStep(3);
        },
        error() {
          toast.error("Failed to parse CSV file");
        },
      });
    },
    [selectedModule]
  );

  function clearFile() {
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setAllRows([]);
    setColumnMapping({});
    setImportResponse(null);
    setImportProgress(0);
    setPersonizeSending(false);
    setPersonizeProgress(null);
    setPersonizeResult(null);
    setPersonizeImportId(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStep(2);
  }

  function resetAll() {
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setAllRows([]);
    setColumnMapping({});
    setImportResponse(null);
    setImportProgress(0);
    setSelectedModule(null);
    setPersonizeSending(false);
    setPersonizeProgress(null);
    setPersonizeResult(null);
    setPersonizeImportId(null);
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStep(1);
  }

  function setMapping(csvCol: string, dbField: string) {
    setColumnMapping((prev) => ({ ...prev, [csvCol]: dbField }));
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Import execution
  // ---------------------------------------------------------------------------

  async function executeImport() {
    if (!selectedModule) return;
    setImporting(true);
    setStep(5);
    setImportProgress(0);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const { data: project } = await supabase
        .from("projects")
        .select("id")
        .eq("slug", "personize")
        .limit(1)
        .single();

      if (!project) throw new Error("Default project not found");

      const mappedRows = buildMappedRows();

      // Send rows in batches for progress feedback
      const BATCH_SIZE = 25;
      const batches = [];
      for (let i = 0; i < mappedRows.length; i += BATCH_SIZE) {
        batches.push(mappedRows.slice(i, i + BATCH_SIZE));
      }

      let totalImported = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      const allResults: RowResult[] = [];
      let processedRows = 0;

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: selectedModule,
            rows: batch,
            project_id: project.id,
            user_id: user.id,
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Import failed");
        }

        const data: ImportResponse = await response.json();
        totalImported += data.imported;
        totalUpdated += data.updated;
        totalSkipped += data.skipped;

        // Adjust row numbers to be relative to full dataset
        for (const r of data.results) {
          allResults.push({
            ...r,
            row: r.row + processedRows,
          });
        }

        processedRows += batch.length;
        setImportProgress(
          Math.round((processedRows / mappedRows.length) * 100)
        );
      }

      const finalResponse: ImportResponse = {
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        total: mappedRows.length,
        results: allResults,
      };

      setImportResponse(finalResponse);
      setImportProgress(100);

      // Also save to imports table for Personize tracking (contacts only)
      if (selectedModule === "contacts" && totalImported > 0) {
        const fieldMappingConfig: Record<string, string> = {};
        for (const [csvCol, dbField] of Object.entries(columnMapping)) {
          if (dbField !== SKIP_VALUE) {
            fieldMappingConfig[csvCol] = dbField;
          }
        }

        const { data: importRecord } = await fetch("/api/import/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file!.name,
            mapped_data: mappedRows,
            field_mapping: fieldMappingConfig,
          }),
        }).then((r) => r.json());

        if (importRecord?.id) {
          setPersonizeImportId(importRecord.id);
        }
      }

      if (totalSkipped > 0) {
        toast.warning(
          `${totalImported} imported, ${totalUpdated} updated, ${totalSkipped} skipped`
        );
      } else {
        toast.success(
          `${totalImported} imported${totalUpdated > 0 ? `, ${totalUpdated} updated` : ""}`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setStep(4);
    } finally {
      setImporting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Personize integration (contacts only)
  // ---------------------------------------------------------------------------

  function startPolling(importId: string) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/import/personize/status?id=${importId}`
        );
        if (!res.ok) return;
        const progress: PersonizeProgress = await res.json();
        setPersonizeProgress(progress);
        if (progress.status === "complete" || progress.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      } catch {
        // Silently retry on next poll
      }
    }, 2000);
  }

  async function sendToPersonize() {
    if (!personizeImportId || !importResponse) return;

    setPersonizeSending(true);
    setPersonizeResult(null);
    setPersonizeProgress({
      total: importResponse.imported,
      processed: 0,
      errors: 0,
      status: "processing",
    });

    startPolling(personizeImportId);

    try {
      const response = await fetch("/api/import/personize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ import_id: personizeImportId }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to send to Personize");
      }

      const result: PersonizeResult = await response.json();
      setPersonizeResult(result);

      if (result.errors === 0) {
        toast.success(
          `Successfully sent ${result.imported} contacts to Personize`
        );
      } else {
        toast.warning(
          `Sent ${result.imported} contacts, ${result.errors} failed`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send to Personize"
      );
    } finally {
      setPersonizeSending(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Computed values
  // ---------------------------------------------------------------------------

  const hasFile = file !== null && csvHeaders.length > 0;
  const hasMappings = activeMappedFields.length > 0;
  const moduleConfig = selectedModule
    ? MODULE_CONFIGS[selectedModule]
    : null;

  const skippedResults = useMemo(
    () => importResponse?.results.filter((r) => r.status === "skipped") ?? [],
    [importResponse]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Import Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a CSV file to import data into any module.
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isComplete =
            step > stepNum || (step === 5 && !!importResponse);
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

      {/* Step 1: Select Module */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Module</CardTitle>
            <CardDescription>
              Choose which module to import data into.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {(Object.entries(MODULE_CONFIGS) as [Module, ModuleConfig][]).map(
                ([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedModule(key);
                      setStep(2);
                    }}
                    className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 ${
                      selectedModule === key
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <div className="text-primary">{config.icon}</div>
                    <div>
                      <p className="text-sm font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload CSV */}
      {step === 2 && selectedModule && (
        <Card>
          <CardHeader>
            <CardTitle>
              Upload CSV — {MODULE_CONFIGS[selectedModule].label}
            </CardTitle>
            <CardDescription>
              Drag and drop a CSV file or click to browse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImportDropzone
              onFile={handleFile}
              file={file}
              onClear={clearFile}
              rowCount={allRows.length}
              columnCount={csvHeaders.length}
            />
            <div className="flex justify-start">
              <Button variant="outline" onClick={resetAll}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Module
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File summary (shown on steps 3-5) */}
      {hasFile && step >= 3 && selectedModule && (
        <ImportDropzone
          onFile={handleFile}
          file={file}
          onClear={clearFile}
          disabled={importing || !!importResponse}
          rowCount={allRows.length}
          columnCount={csvHeaders.length}
        />
      )}

      {/* Step 3: Column Mapping */}
      {step === 3 && hasFile && selectedModule && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map each CSV column to a {moduleConfig?.label} field, or skip it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnMapper
              csvHeaders={csvHeaders}
              fields={moduleConfig?.fields ?? []}
              mapping={columnMapping}
              onMappingChange={setMapping}
              sampleRow={csvRows[0]}
              skipValue={SKIP_VALUE}
            />

            <div className="mt-6 flex justify-between">
              <Button variant="outline" onClick={clearFile}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(4)} disabled={!hasMappings}>
                Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Preview */}
      {step === 4 && hasFile && hasMappings && selectedModule && (
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
                        {moduleConfig?.fields.find((f) => f.value === field)
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
              <Button variant="outline" onClick={() => setStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={executeImport}>
                Import {allRows.length} {moduleConfig?.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Importing / Results */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {importing
                ? "Importing..."
                : importResponse
                  ? "Import Complete"
                  : "Import"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Progress during import */}
            {importing && (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Importing row{" "}
                    {Math.round((importProgress / 100) * allRows.length)} of{" "}
                    {allRows.length}...
                  </p>
                </div>
                <Progress value={importProgress} className="w-full" />
                <p className="text-center text-xs text-muted-foreground">
                  {importProgress}% complete
                </p>
              </div>
            )}

            {/* Results */}
            {importResponse &&
              !personizeSending &&
              !personizeResult && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-3 py-4">
                    {importResponse.skipped === 0 ? (
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    ) : importResponse.imported > 0 ? (
                      <AlertCircle className="h-10 w-10 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-10 w-10 text-red-500" />
                    )}
                    <p className="text-lg font-medium">
                      {importResponse.imported > 0
                        ? "Import Successful"
                        : "No Records Imported"}
                    </p>
                  </div>

                  {/* Summary grid */}
                  <div className="rounded-lg border p-4">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {importResponse.imported}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Imported
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {importResponse.updated}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-muted-foreground">
                          {importResponse.skipped}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Skipped
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {importResponse.total}
                        </p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </div>

                  {/* Skipped rows detail */}
                  {skippedResults.length > 0 && (
                    <div className="rounded-lg border p-4">
                      <p className="mb-2 text-sm font-medium">
                        Skipped Rows ({skippedResults.length})
                      </p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {skippedResults.map((result, i) => (
                          <p
                            key={i}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-mono">
                              Row #{result.row}
                            </span>
                            {" — "}
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {result.reason || "Unknown reason"}
                            </Badge>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={resetAll}>
                      Import Another File
                    </Button>

                    {selectedModule === "contacts" && personizeImportId && (
                      <Button onClick={sendToPersonize}>
                        <Send className="mr-2 h-4 w-4" />
                        Send to Personize
                      </Button>
                    )}
                  </div>
                </div>
              )}

            {/* Personize batch progress */}
            {(personizeSending || personizeResult) && personizeProgress && (
              <div className="space-y-4">
                <ImportProgress
                  total={personizeProgress.total}
                  processed={personizeProgress.processed}
                  errors={personizeProgress.errors}
                  status={personizeProgress.status}
                />

                {personizeResult && personizeResult.details.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-sm font-medium">Error Details</p>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {personizeResult.details.map((detail, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          <span className="font-mono">
                            #{detail.index + 1}
                          </span>{" "}
                          {detail.email && (
                            <span className="font-medium">
                              {detail.email}:{" "}
                            </span>
                          )}
                          {detail.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {personizeResult && (
                  <div className="flex justify-start pt-2">
                    <Button variant="outline" onClick={resetAll}>
                      Import Another File
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
