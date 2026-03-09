"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  AlertCircle,
  AlertTriangle,
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Module definitions
// ---------------------------------------------------------------------------

type ImportModule = "contacts" | "tasks" | "content" | "pipeline";

interface FieldDef {
  value: string;
  label: string;
}

const MODULE_INFO: Record<
  ImportModule,
  { label: string; description: string; requiresProject: boolean }
> = {
  contacts: {
    label: "Contacts",
    description: "Import contacts with duplicate detection by email.",
    requiresProject: true,
  },
  tasks: {
    label: "Tasks",
    description: "Import tasks with duplicate detection by title.",
    requiresProject: false,
  },
  content: {
    label: "Content",
    description: "Import content posts with duplicate detection by title.",
    requiresProject: false,
  },
  pipeline: {
    label: "Pipeline",
    description:
      "Import pipeline items. Stages are created automatically from the stage column.",
    requiresProject: true,
  },
};

const MODULE_FIELDS: Record<ImportModule, FieldDef[]> = {
  contacts: [
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "company", label: "Company" },
    { value: "source", label: "Source" },
    { value: "linkedin_url", label: "LinkedIn URL" },
    { value: "qualified_status", label: "Qualified Status" },
    { value: "next_action", label: "Next Action" },
  ],
  tasks: [
    { value: "title", label: "Title" },
    { value: "description", label: "Description" },
    { value: "status", label: "Status" },
    { value: "priority", label: "Priority" },
    { value: "due_date", label: "Due Date" },
    { value: "assignee", label: "Assignee" },
    { value: "context", label: "Context" },
  ],
  content: [
    { value: "title", label: "Title" },
    { value: "body", label: "Body" },
    { value: "platform", label: "Platform" },
    { value: "type", label: "Type" },
    { value: "status", label: "Status" },
    { value: "scheduled_for", label: "Scheduled For" },
  ],
  pipeline: [
    { value: "title", label: "Title" },
    { value: "stage", label: "Stage" },
    { value: "value", label: "Value" },
  ],
};

// Personize fields (for optional post-import enrichment)
const PERSONIZE_FIELDS: FieldDef[] = [
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
];

const SKIP_VALUE = "__skip__";

// ---------------------------------------------------------------------------
// Column auto-detection
// ---------------------------------------------------------------------------

function guessMapping(csvHeader: string, fields: FieldDef[]): string {
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
// Types
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3 | 4;

interface RowResult {
  row: number;
  action: "imported" | "updated" | "skipped";
  reason?: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  total: number;
  results: RowResult[];
}

interface ProjectOption {
  id: string;
  name: string;
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

const STEP_LABELS = ["Upload", "Map Columns", "Preview", "Import"];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ImportPage() {
  // Core state
  const [step, setStep] = useState<Step>(1);
  const [mod, setMod] = useState<ImportModule>("contacts");
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {}
  );
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Project state
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Personize state (contacts-only post-import action)
  const [personizeSending, setPersonizeSending] = useState(false);
  const [personizeProgress, setPersonizeProgress] =
    useState<PersonizeProgress | null>(null);
  const [personizeResult, setPersonizeResult] =
    useState<PersonizeResult | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [personizeImportId, setPersonizeImportId] = useState<string | null>(
    null
  );

  const fields = MODULE_FIELDS[mod];

  // Load projects on mount
  useEffect(() => {
    async function load() {
      setLoadingProjects(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("projects")
          .select("id, name")
          .order("name");
        if (data && data.length > 0) {
          setProjects(data);
          setProjectId(data[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoadingProjects(false);
      }
    }
    load();
  }, []);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // File handling
  // -----------------------------------------------------------------------

  const handleFile = useCallback(
    (f: File) => {
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
            mapping[h] = guessMapping(h, fields);
          }
          setColumnMapping(mapping);
          setStep(2);
        },
        error() {
          toast.error("Failed to parse CSV file");
        },
      });
    },
    [fields]
  );

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
    setImportProgress(0);
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

  // -----------------------------------------------------------------------
  // Import execution
  // -----------------------------------------------------------------------

  async function executeImport() {
    setImporting(true);
    setStep(4);
    setImportProgress(0);

    // Simulate progress animation while API processes
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const mappedRows = buildMappedRows();

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: mod,
          mapped_data: mappedRows,
          project_id: projectId,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import failed");
      }

      const result: ImportResult = await response.json();
      setImportProgress(100);
      setImportResult(result);

      // If contacts, also save to imports table for Personize integration
      if (mod === "contacts") {
        try {
          const personizeRes = await fetch("/api/import/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file!.name,
              mapped_data: buildPersonizeMappedRows(),
              field_mapping: buildPersonizeFieldMapping(),
            }),
          });
          if (personizeRes.ok) {
            const pData = await personizeRes.json();
            setPersonizeImportId(pData.id);
          }
        } catch {
          // Personize record is optional, don't block import
        }
      }

      if (result.skipped === 0) {
        toast.success(
          `Imported ${result.imported}${result.updated > 0 ? `, updated ${result.updated}` : ""} records`
        );
      } else {
        toast.warning(
          `${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped`
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
      setStep(3);
    } finally {
      clearInterval(progressInterval);
      setImporting(false);
    }
  }

  /** Build Personize-format mapped rows (for optional Personize send) */
  function buildPersonizeMappedRows(): Record<string, string | null>[] {
    const personizeMapping: Record<string, string> = {};
    for (const [csvCol, dbField] of Object.entries(columnMapping)) {
      if (dbField === SKIP_VALUE) continue;
      const pzGuess = guessMapping(csvCol, PERSONIZE_FIELDS);
      if (pzGuess !== SKIP_VALUE) personizeMapping[csvCol] = pzGuess;
    }
    return allRows.map((row) => {
      const mapped: Record<string, string | null> = {};
      for (const [csvCol, pzField] of Object.entries(personizeMapping)) {
        mapped[pzField] = row[csvCol]?.trim() || null;
      }
      return mapped;
    });
  }

  function buildPersonizeFieldMapping(): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (const [csvCol] of Object.entries(columnMapping)) {
      const pzGuess = guessMapping(csvCol, PERSONIZE_FIELDS);
      if (pzGuess !== SKIP_VALUE) mapping[csvCol] = pzGuess;
    }
    return mapping;
  }

  // -----------------------------------------------------------------------
  // Personize integration (contacts only)
  // -----------------------------------------------------------------------

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
        // retry next poll
      }
    }, 2000);
  }

  async function sendToPersonize() {
    if (!personizeImportId) return;
    setPersonizeSending(true);
    setPersonizeResult(null);
    setPersonizeProgress({
      total: allRows.length,
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

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const hasFile = file !== null && csvHeaders.length > 0;
  const hasMappings = activeMappedFields.length > 0;
  const moduleInfo = MODULE_INFO[mod];
  const needsProject = moduleInfo.requiresProject;

  const personizeProgressPct =
    personizeProgress && personizeProgress.total > 0
      ? Math.round(
          (personizeProgress.processed / personizeProgress.total) * 100
        )
      : 0;

  const skippedResults =
    importResult?.results.filter((r) => r.action === "skipped") ?? [];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Data</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to import data into any module.
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
                  className={`h-px w-8 ${isComplete ? "bg-primary" : "bg-border"}`}
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
                  className={`text-xs ${isActive ? "font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================================ */}
      {/* Step 1: Module selector + Upload                                  */}
      {/* ================================================================ */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload CSV</CardTitle>
            <CardDescription>
              Select a module and drag-and-drop or browse for a CSV file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Module selector */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Import into
                </label>
                <Select
                  value={mod}
                  onValueChange={(v) => setMod(v as ImportModule)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(MODULE_INFO) as [
                        ImportModule,
                        (typeof MODULE_INFO)[ImportModule],
                      ][]
                    ).map(([key, info]) => (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {moduleInfo.description}
                </p>
              </div>

              {/* Project selector */}
              {needsProject && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Project
                  </label>
                  {loadingProjects ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading projects...
                    </div>
                  ) : projects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No projects found. Create a project first.
                    </p>
                  ) : (
                    <Select
                      value={projectId ?? ""}
                      onValueChange={setProjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            {/* Drag-and-drop zone */}
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

      {/* File summary (steps 2-4) */}
      {hasFile && step >= 2 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">
                {file.name}{" "}
                <Badge variant="secondary" className="ml-2">
                  {moduleInfo.label}
                </Badge>
              </p>
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

      {/* ================================================================ */}
      {/* Step 2: Column Mapping                                            */}
      {/* ================================================================ */}
      {step === 2 && hasFile && (
        <Card>
          <CardHeader>
            <CardTitle>Map Columns</CardTitle>
            <CardDescription>
              Map each CSV column to a {moduleInfo.label.toLowerCase()} field, or
              skip it.
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
                        {fields.map((field) => (
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
              <Button onClick={() => setStep(3)} disabled={!hasMappings}>
                Preview
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Step 3: Preview                                                   */}
      {/* ================================================================ */}
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
                        {fields.find((f) => f.value === field)?.label ?? field}
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
              <Button
                onClick={executeImport}
                disabled={needsProject && !projectId}
              >
                Import {allRows.length} {moduleInfo.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================ */}
      {/* Step 4: Importing / Results                                       */}
      {/* ================================================================ */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {importing
                ? "Importing..."
                : personizeSending
                  ? "Sending to Personize..."
                  : "Import Complete"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Progress during import */}
            {importing && (
              <div className="space-y-4 py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Importing {allRows.length} {moduleInfo.label.toLowerCase()}{" "}
                    records...
                  </p>
                </div>
                <Progress value={importProgress} className="w-full" />
                <p className="text-center text-xs text-muted-foreground">
                  Processing rows...
                </p>
              </div>
            )}

            {/* Import results */}
            {importResult && !personizeSending && !personizeResult && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  {importResult.skipped === 0 ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  ) : importResult.imported > 0 ||
                    importResult.updated > 0 ? (
                    <AlertTriangle className="h-10 w-10 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-red-500" />
                  )}
                  <p className="text-lg font-medium">
                    {importResult.skipped === 0
                      ? "All Records Imported Successfully"
                      : importResult.imported > 0 || importResult.updated > 0
                        ? "Import Completed with Warnings"
                        : "Import Failed"}
                  </p>
                </div>

                {/* Summary stats */}
                <div className="rounded-lg border p-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {importResult.total}
                      </p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {importResult.imported}
                      </p>
                      <p className="text-xs text-muted-foreground">Imported</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {importResult.updated}
                      </p>
                      <p className="text-xs text-muted-foreground">Updated</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-muted-foreground">
                        {importResult.skipped}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Skipped
                      </p>
                    </div>
                  </div>
                </div>

                {/* Skipped row details */}
                {skippedResults.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-sm font-medium">
                      Skipped Rows ({skippedResults.length})
                    </p>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {skippedResults.map((r) => (
                        <p
                          key={r.row}
                          className="text-xs text-muted-foreground"
                        >
                          <span className="font-mono">Row {r.row}</span>
                          {" — "}
                          {r.reason}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <Button variant="outline" onClick={clearFile}>
                    Import Another File
                  </Button>

                  {mod === "contacts" && personizeImportId && (
                    <Button onClick={sendToPersonize}>
                      <Send className="mr-2 h-4 w-4" />
                      Send to Personize
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Personize sending progress */}
            {personizeSending && personizeProgress && (
              <div className="space-y-4 py-4">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-lg font-medium">
                    Sending to Personize...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {personizeProgress.processed} of{" "}
                    {personizeProgress.total} contacts processed
                    {personizeProgress.errors > 0 &&
                      ` (${personizeProgress.errors} errors)`}
                  </p>
                </div>
                <Progress value={personizeProgressPct} className="w-full" />
                <p className="text-center text-xs text-muted-foreground">
                  {personizeProgressPct}% complete — rate limited to 1
                  contact/sec
                </p>
              </div>
            )}

            {/* Personize results */}
            {personizeResult && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 py-4">
                  {personizeResult.errors === 0 ? (
                    <CheckCircle2 className="h-10 w-10 text-green-500" />
                  ) : personizeResult.imported > 0 ? (
                    <AlertCircle className="h-10 w-10 text-yellow-500" />
                  ) : (
                    <AlertCircle className="h-10 w-10 text-red-500" />
                  )}
                  <p className="text-lg font-medium">
                    {personizeResult.errors === 0
                      ? "All Contacts Sent Successfully"
                      : personizeResult.imported > 0
                        ? "Completed with Errors"
                        : "Send Failed"}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {personizeResult.imported}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Successful
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {personizeResult.errors}
                      </p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{allRows.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                  </div>
                </div>

                {personizeResult.details.length > 0 && (
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

                <div className="flex justify-start pt-2">
                  <Button variant="outline" onClick={clearFile}>
                    Import Another File
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
