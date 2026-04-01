"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
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
import { SeedRunner } from "@/components/admin/SeedRunner";
import { CronMonitor } from "@/components/admin/cron-monitor";
import { SyncHealthWidget } from "@/components/admin/SyncHealthWidget";
import { SyncStatusWidget } from "@/components/admin/SyncStatusWidget";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TableCount {
  table: string;
  count: number;
}

interface OrphanCheck {
  table: string;
  foreignKey: string;
  referencedTable: string;
  orphanedCount: number;
}

interface HealthCheckResult {
  status: "healthy" | "warning" | "error";
  tableCounts: TableCount[];
  orphanChecks: OrphanCheck[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Health Check Panel
// ---------------------------------------------------------------------------

function HealthCheckPanel() {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runHealthCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/health");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Health check failed");
      }

      setHealth(data);

      if (data.status === "healthy") {
        toast.success("All integrity checks passed");
      } else if (data.status === "warning") {
        toast.warning("Orphaned records detected");
      } else {
        toast.error("Health check encountered errors");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const statusIcon = {
    healthy: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
  };

  const statusLabel = {
    healthy: "Healthy",
    warning: "Warning",
    error: "Error",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5" />
                Referential Integrity
              </CardTitle>
              <CardDescription>
                Check for orphaned records and missing foreign key references
              </CardDescription>
            </div>
            <Button onClick={runHealthCheck} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run Check
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {health && (
          <CardContent className="space-y-6">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              {statusIcon[health.status]}
              <span className="font-medium">{statusLabel[health.status]}</span>
              <span className="text-sm text-muted-foreground">
                — {new Date(health.timestamp).toLocaleString()}
              </span>
            </div>

            {/* Table counts */}
            <div>
              <h3 className="mb-3 text-sm font-medium">Table Row Counts</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {health.tableCounts.map((tc) => (
                      <TableRow key={tc.table}>
                        <TableCell className="font-mono text-sm">
                          {tc.table}
                        </TableCell>
                        <TableCell className="text-right">
                          {tc.count === -1 ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : (
                            tc.count.toLocaleString()
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Orphan checks */}
            <div>
              <h3 className="mb-3 text-sm font-medium">
                Foreign Key Integrity
              </h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Table</TableHead>
                      <TableHead>Foreign Key</TableHead>
                      <TableHead>References</TableHead>
                      <TableHead className="text-right">Orphaned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {health.orphanChecks.map((oc) => (
                      <TableRow key={`${oc.table}-${oc.foreignKey}`}>
                        <TableCell className="font-mono text-sm">
                          {oc.table}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {oc.foreignKey}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {oc.referencedTable}
                        </TableCell>
                        <TableCell className="text-right">
                          {oc.orphanedCount === -1 ? (
                            <Badge variant="destructive">Error</Badge>
                          ) : oc.orphanedCount > 0 ? (
                            <Badge variant="destructive">
                              {oc.orphanedCount}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin Page
// ---------------------------------------------------------------------------

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Database className="h-6 w-6" />
          Admin Panel
        </h1>
        <p className="mt-1 text-muted-foreground">
          Seed demo data, verify referential integrity, and monitor system
          health.
        </p>
      </div>

      {/* Sync Health */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" />
          Data Source Health
        </h2>
        <SyncHealthWidget />
      </section>

      {/* Sync Status */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" />
          Personize Sync Status
        </h2>
        <SyncStatusWidget />
      </section>

      {/* Cron Monitor */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" />
          Cron Jobs
        </h2>
        <CronMonitor />
      </section>

      {/* Seed Runner */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" />
          Data Seeding
        </h2>
        <SeedRunner />
      </section>

      {/* Health Check */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="h-5 w-5" />
          System Health
        </h2>
        <HealthCheckPanel />
      </section>
    </div>
  );
}
