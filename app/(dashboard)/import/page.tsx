"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileSpreadsheet, X } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type TargetTable = "tasks" | "contacts";
type DuplicateHandling = "skip" | "update";

interface ProjectOption {
  id: string;
  name: string;
}

const TASK_FIELDS = [
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due Date" },
  { value: "assignee", label: "Assignee" },
  { value: "context", label: "Context" },
] as const;

const CONTACT_FIELDS = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "company", label: "Company" },
  { value: "source", label: "Source" },
  { value: "qualified_status", label: "Qualified Status" },
  { value: "linkedin_url", label: "LinkedIn URL" },
  { value: "next_action", label: "Next Action" },
] as const;

const SKIP_VALUE = "__skip__";

function guessMapping(
  csvHeader: string,
  fields: ReadonlyArray<{ value: string; label: string }>
): string {
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

export default function ImportPage() {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current && typeof window !== "undefined") {
    supabaseRef.current = createClient();
  }
  const supabase = supabaseRef.current!;

  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [targetTable, setTargetTable] = useState<TargetTable>("contacts");
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>(
    {}
  );
  const [projectId, setProjectId] = useState<string>("");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [importing, setImporting] = useState(false);
  const [duplicateHandling, setDuplicateHandling] =
    useState<DuplicateHandling>("skip");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      setProjects((data as ProjectOption[]) ?? []);
    }
    fetchProjects();
  }, [supabase]);

  const dbFields = useMemo(
    () => (targetTable === "tasks" ? TASK_FIELDS : CONTACT_FIELDS),
    [targetTable]
  );

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
            mapping[h] = guessMapping(h, dbFields);
          }
          setColumnMapping(mapping);
        },
        error() {
          toast.error("Failed to parse CSV file");
        },
      });
    },
    [dbFields]
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
  }

  function handleTableChange(table: TargetTable) {
    setTargetTable(table);
    const fields = table === "tasks" ? TASK_FIELDS : CONTACT_FIELDS;
    const mapping: Record<string, string> = {};
    for (const h of csvHeaders) {
      mapping[h] = guessMapping(h, fields);
    }
    setColumnMapping(mapping);
  }

  function setMapping(csvCol: string, dbField: string) {
    setColumnMapping((prev) => ({ ...prev, [csvCol]: dbField }));
  }

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

  const activeMappedFields = useMemo(
    () =>
      Object.values(columnMapping).filter((v) => v !== SKIP_VALUE),
    [columnMapping]
  );

  async function handleImport() {
    if (!projectId) {
      toast.error("Please select a project");
      return;
    }

    const requiredField = targetTable === "tasks" ? "title" : "name";
    if (!activeMappedFields.includes(requiredField)) {
      toast.error(
        `You must map a column to "${requiredField}" for ${targetTable}`
      );
      return;
    }

    setConfirmOpen(true);
  }

  async function executeImport() {
    setConfirmOpen(false);
    setImporting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to import");
        setImporting(false);
        return;
      }

      const mappedRows = buildMappedRows();
      const rows: Record<string, string | null>[] = mappedRows.map((row) => ({
        ...row,
        project_id: projectId,
        user_id: user.id,
      }));

      if (targetTable === "contacts" && duplicateHandling !== "skip") {
        // For update mode, upsert on email
        const hasEmail = activeMappedFields.includes("email");
        if (hasEmail) {
          const { error, data } = await supabase
            .from("contacts")
            .upsert(rows, {
              onConflict: "project_id,email",
              ignoreDuplicates: false,
            })
            .select("id");

          if (error) {
            toast.error(`Import failed: ${error.message}`);
          } else {
            toast.success(`Imported ${data?.length ?? rows.length} contacts`);
            clearFile();
          }
          setImporting(false);
          return;
        }
      }

      if (
        targetTable === "contacts" &&
        duplicateHandling === "skip" &&
        activeMappedFields.includes("email")
      ) {
        // Filter out rows with emails that already exist
        const emails = rows
          .map((r) => r.email)
          .filter((e): e is string => !!e);

        if (emails.length > 0) {
          const { data: existing } = await supabase
            .from("contacts")
            .select("email")
            .eq("project_id", projectId)
            .in("email", emails);

          const existingEmails = new Set(
            (existing ?? []).map((c: { email: string }) => c.email)
          );
          const filteredRows = rows.filter(
            (r) => !r.email || !existingEmails.has(r.email)
          );

          const skipped = rows.length - filteredRows.length;

          if (filteredRows.length === 0) {
            toast.info(
              `All ${rows.length} rows were duplicates and skipped`
            );
            setImporting(false);
            return;
          }

          const { error } = await supabase
            .from("contacts")
            .insert(filteredRows);

          if (error) {
            toast.error(`Import failed: ${error.message}`);
          } else {
            const msg =
              skipped > 0
                ? `Imported ${filteredRows.length} contacts (${skipped} duplicates skipped)`
                : `Imported ${filteredRows.length} contacts`;
            toast.success(msg);
            clearFile();
          }
          setImporting(false);
          return;
        }
      }

      // Default: simple insert
      const { error } = await supabase.from(targetTable).insert(rows);

      if (error) {
        toast.error(`Import failed: ${error.message}`);
      } else {
        toast.success(`Imported ${rows.length} ${targetTable}`);
        clearFile();
      }
    } catch {
      toast.error("An unexpected error occurred during import");
    } finally {
      setImporting(false);
    }
  }

  const hasFile = file !== null && csvHeaders.length > 0;
  const hasMappings = activeMappedFields.length > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import Data</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to bulk import contacts or tasks into a project.
        </p>
      </div>

      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV</CardTitle>
          <CardDescription>
            Drag and drop a CSV file or click to browse.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasFile ? (
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
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
          ) : (
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
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {hasFile && (
        <>
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Import Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Target Table</Label>
                  <Select
                    value={targetTable}
                    onValueChange={(v) => handleTableChange(v as TargetTable)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contacts">Contacts</SelectItem>
                      <SelectItem value="tasks">Tasks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="w-full">
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
                </div>
                {targetTable === "contacts" && (
                  <div className="space-y-2">
                    <Label>Duplicate Emails</Label>
                    <Select
                      value={duplicateHandling}
                      onValueChange={(v) =>
                        setDuplicateHandling(v as DuplicateHandling)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip duplicates</SelectItem>
                        <SelectItem value="update">
                          Update duplicates
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column Mapping */}
          <Card>
            <CardHeader>
              <CardTitle>Column Mapping</CardTitle>
              <CardDescription>
                Map each CSV column to a database field, or skip it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {csvHeaders.map((header) => (
                  <div
                    key={header}
                    className="flex items-center gap-4"
                  >
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
                          <SelectItem value={SKIP_VALUE}>
                            -- Skip --
                          </SelectItem>
                          {dbFields.map((field) => (
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
            </CardContent>
          </Card>

          {/* Preview */}
          {hasMappings && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  Showing first {previewMappedRows.length} of {allRows.length}{" "}
                  rows with mapped columns.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {activeMappedFields.map((field) => (
                          <TableHead key={field}>
                            {dbFields.find((f) => f.value === field)?.label ??
                              field}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewMappedRows.map((row, i) => (
                        <TableRow key={i}>
                          {activeMappedFields.map((field) => (
                            <TableCell key={field}>
                              {row[field] ?? "—"}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleImport}
              disabled={importing || !hasMappings || !projectId}
            >
              {importing ? "Importing..." : `Import ${allRows.length} Rows`}
            </Button>
          </div>

          {/* Confirmation Dialog */}
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Import</DialogTitle>
                <DialogDescription>
                  You are about to import {allRows.length} rows into the{" "}
                  <strong>{targetTable}</strong> table
                  {targetTable === "contacts" &&
                    duplicateHandling === "skip" &&
                    " (duplicates by email will be skipped)"}
                  {targetTable === "contacts" &&
                    duplicateHandling === "update" &&
                    " (duplicates by email will be updated)"}
                  . This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={executeImport}>Confirm Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
