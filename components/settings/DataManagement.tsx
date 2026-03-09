"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  HardDrive,
} from "lucide-react";

function generateSampleCSV(): string {
  const headers = [
    "Name",
    "Email",
    "Company",
    "Status",
    "Source",
    "Created At",
  ];
  const rows = [
    [
      "Alice Johnson",
      "alice@example.com",
      "Acme Corp",
      "Active",
      "LinkedIn",
      "2025-12-01",
    ],
    [
      "Bob Smith",
      "bob@example.com",
      "TechStart",
      "Lead",
      "Website",
      "2025-12-05",
    ],
    [
      "Carol Williams",
      "carol@example.com",
      "GlobalInc",
      "Active",
      "Referral",
      "2025-12-10",
    ],
    [
      "David Brown",
      "david@example.com",
      "DataFlow",
      "Nurture",
      "Twitter",
      "2025-12-15",
    ],
    [
      "Eve Davis",
      "eve@example.com",
      "CloudSoft",
      "Active",
      "LinkedIn",
      "2026-01-02",
    ],
  ];

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function DataManagement() {
  const [exporting, setExporting] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Simulate data gathering
      await new Promise((r) => setTimeout(r, 500));

      const csv = generateSampleCSV();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `command-center-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleClearCache = useCallback(async () => {
    setClearingCache(true);
    try {
      // Clear localStorage cache entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("cache-")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      await new Promise((r) => setTimeout(r, 400));
      toast.success("Cache cleared successfully");
    } catch {
      toast.error("Failed to clear cache");
    } finally {
      setClearingCache(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Export Data */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Export Data</p>
          <p className="text-sm text-muted-foreground">
            Download all your data as a CSV file
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
          className="gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Clear Cache */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Clear Cache</p>
          <p className="text-sm text-muted-foreground">
            Remove locally cached data to free up space
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearCache}
          disabled={clearingCache}
          className="gap-2"
        >
          {clearingCache ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <HardDrive className="h-4 w-4" />
          )}
          {clearingCache ? "Clearing..." : "Clear Cache"}
        </Button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="text-sm font-semibold text-destructive">Danger Zone</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Delete Account
            </p>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove all of your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => {
                    toast.success(
                      "Account deletion requested — this is a placeholder action"
                    );
                  }}
                >
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
