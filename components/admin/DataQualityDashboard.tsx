"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldCheck {
  field: string;
  missing: number;
}

interface TableMetrics {
  table: string;
  row_count: number;
  field_checks: FieldCheck[];
  completeness_pct: number;
  last_created_at: string | null;
}

type Status = "green" | "yellow" | "red";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  green: {
    badge: "default" as const,
    label: "Good",
    icon: CheckCircle2,
    dot: "bg-green-500",
  },
  yellow: {
    badge: "secondary" as const,
    label: "Warning",
    icon: AlertTriangle,
    dot: "bg-yellow-500",
  },
  red: {
    badge: "destructive" as const,
    label: "Critical",
    icon: XCircle,
    dot: "bg-red-500",
  },
};

function computeStatus(completeness: number, lastCreatedAt: string | null): Status {
  const daysSinceUpdate = lastCreatedAt
    ? (Date.now() - new Date(lastCreatedAt).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (completeness < 50 || daysSinceUpdate > 30) return "red";
  if (completeness < 80 || daysSinceUpdate > 7) return "yellow";
  return "green";
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataQualityDashboard() {
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const { data: metrics = [], isLoading, refetch } = useQuery<TableMetrics[]>({
    queryKey: ["admin", "data-quality"],
    queryFn: async () => {
      const res = await fetch("/api/admin/data-quality");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch");
      return json.data;
    },
  });

  const handleRefresh = async () => {
    await refetch();
    toast.success("Data quality refreshed");
  };

  if (isLoading && metrics.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Data Quality</CardTitle>
            <CardDescription>
              Row counts, field completeness, and freshness for core tables
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead className="text-right">Completeness</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => {
                const status = computeStatus(m.completeness_pct, m.last_created_at);
                const config = STATUS_CONFIG[status];
                const StatusIcon = config.icon;
                const isExpanded = expandedTable === m.table;

                return (
                  <TableRow
                    key={m.table}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedTable(isExpanded ? null : m.table)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`}
                        />
                        <span className="font-mono text-sm">{m.table}</span>
                      </div>
                      {isExpanded && m.field_checks.length > 0 && (
                        <div className="mt-2 space-y-1 pl-5">
                          {m.field_checks.map((fc) => (
                            <div
                              key={fc.field}
                              className="flex items-center justify-between text-xs text-muted-foreground"
                            >
                              <span className="font-mono">{fc.field}</span>
                              <span>
                                {fc.missing === -1
                                  ? "Error"
                                  : `${fc.missing} missing`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {m.row_count === -1 ? (
                        <Badge variant="destructive">Error</Badge>
                      ) : (
                        m.row_count.toLocaleString()
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          m.completeness_pct >= 80
                            ? "text-green-600 dark:text-green-400"
                            : m.completeness_pct >= 50
                              ? "text-yellow-600 dark:text-yellow-400"
                              : "text-red-600 dark:text-red-400"
                        }
                      >
                        {m.completeness_pct}%
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatRelativeTime(m.last_created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.badge} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
