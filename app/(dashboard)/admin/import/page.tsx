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
import { createClient } from "@/lib/supabase/client";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

interface ImportSectionProps {
  title: string;
  description: string;
  endpoint: string;
}

function ImportSection({ title, description, endpoint }: ImportSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
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
    setResult(null);
  }

  async function executeImport() {
    if (allRows.length === 0) return;
    setImporting(true);
    setResult(null);

    try {
      // Get current user + Personize project
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

      if (!project) throw new Error("Personize project not found");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: allRows,
          project_id: project.id,
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import failed");
      }

      const data: ImportResult = await response.json();
      setResult(data);

      if (data.errors.length === 0) {
        toast.success(`Imported ${data.imported} records`);
      } else {
        toast.warning(
          `Imported ${data.imported}, ${data.errors.length} errors`
        );
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
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
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Drop CSV here or click to browse
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
        )}

        {/* File info */}
        {hasFile && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {allRows.length} rows, {headers.length} columns
                </p>
              </div>
            </div>
            {!importing && (
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            )}
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
            disabled={importing}
            className="w-full"
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing {allRows.length} records...
              </>
            ) : (
              <>Import {allRows.length} Records</>
            )}
          </Button>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
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
      </CardContent>
    </Card>
  );
}

export default function AdminImportPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Airtable Data Import</h1>
        <p className="text-sm text-muted-foreground">
          Import cleaned Airtable CSV data into contacts, sales pipeline,
          content, conversations, and team tables.
        </p>
        <Badge variant="secondary" className="mt-2">
          Admin
        </Badge>
      </div>

      <ImportSection
        title="Contacts Import"
        description="Upload contacts CSV. Maps Name, Email, Company, LinkedIn URL, and metadata fields. Upserts on email to prevent duplicates."
        endpoint="/api/import/airtable-contacts"
      />

      <ImportSection
        title="Sales Pipeline Import"
        description="Upload sales pipeline CSV. Maps Deal Name, Company, Stage, and deal metadata. Creates default stages if pipeline doesn't exist."
        endpoint="/api/import/sales-pipeline"
      />

      <ImportSection
        title="Content Master Import"
        description="Upload content master CSV (341 rows). Maps Title, Brand, Content Type, Core Message, Tone, Status, and Week Of into content_posts table."
        endpoint="/api/import/content-master"
      />

      <ImportSection
        title="Conversations Import"
        description="Upload conversations CSV (98 rows). Maps Summary, Channel, Direction, Message, Date, Status, and Contact (fuzzy name match) into conversations table."
        endpoint="/api/import/conversations"
      />

      <ImportSection
        title="Hackathon Participants Import"
        description="Upload hackathon participants CSV (60 rows). Maps Name, Email, LinkedIn, Role, AI Experience, and event metadata into contacts table under the Hackathons project. Upserts on email."
        endpoint="/api/import/hackathon-participants"
      />

      <ImportSection
        title="Team Members Import"
        description="Upload team members CSV (11 rows). Maps Name, Role, Email, Project Assignment, Status, Skills, and Notes into contacts table. Upserts on email."
        endpoint="/api/import/team-members"
      />
    </div>
  );
}
