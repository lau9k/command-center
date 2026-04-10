"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, AlertTriangle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/types/database";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HealthStats {
  totalContacts: number;
  contactsWithMemories: number;
  contactsWithoutMemories: number;
  lastIngestionDate: string | null;
  topGaps: Array<{
    id: string;
    name: string;
    email: string | null;
    score: number;
    memorized_at: string | null;
  }>;
}

type QualityRating = "empty" | "stale" | "partial" | "good";

interface RecallResult {
  email: string;
  wordCount: number;
  quality: QualityRating;
  answer: string | null;
  recordCount: number;
}

type MemoryStatus = "good" | "partial" | "empty";

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  score: number;
  memorized_at: string | null;
  memory_count: number | null;
  status: MemoryStatus;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveStatus(contact: Contact): MemoryStatus {
  if (!contact.memorized_at) return "empty";
  const daysSince = Math.floor(
    (Date.now() - new Date(contact.memorized_at).getTime()) / 86_400_000
  );
  if (daysSince > 30) return "partial";
  return "good";
}

const statusConfig: Record<
  MemoryStatus,
  { label: string; variant: "default" | "secondary" | "destructive"; className: string }
> = {
  good: {
    label: "Good",
    variant: "default",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  },
  partial: {
    label: "Partial",
    variant: "secondary",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  },
  empty: {
    label: "Empty",
    variant: "destructive",
    className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25",
  },
};

const qualityConfig: Record<QualityRating, { className: string }> = {
  good: { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25" },
  partial: { className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25" },
  stale: { className: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/25" },
  empty: { className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsCards({ stats }: { stats: HealthStats }) {
  const pct =
    stats.totalContacts > 0
      ? Math.round((stats.contactsWithMemories / stats.totalContacts) * 100)
      : 0;

  const cards = [
    {
      label: "Total Contacts",
      value: stats.totalContacts,
      icon: Brain,
      detail: null,
    },
    {
      label: "With Memories",
      value: stats.contactsWithMemories,
      icon: CheckCircle2,
      detail: `${pct}% coverage`,
    },
    {
      label: "Without Memories",
      value: stats.contactsWithoutMemories,
      icon: AlertTriangle,
      detail: stats.contactsWithoutMemories > 0 ? "Action needed" : "All good",
    },
    {
      label: "Last Ingestion",
      value: formatDate(stats.lastIngestionDate),
      icon: Clock,
      detail: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.label}
            </CardTitle>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{c.value}</div>
            {c.detail && (
              <p className="text-xs text-muted-foreground">{c.detail}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecallTestButton({
  email,
  result,
  loading,
  onTest,
}: {
  email: string;
  result: RecallResult | undefined;
  loading: boolean;
  onTest: (email: string) => void;
}) {
  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }

  if (result) {
    const cfg = qualityConfig[result.quality];
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={cfg.className}>
          {result.quality}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {result.wordCount}w / {result.recordCount}r
        </span>
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => onTest(email)}>
      Test Recall
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface MemoryHealthClientProps {
  initialContacts: ContactRow[];
}

export function MemoryHealthClient({ initialContacts }: MemoryHealthClientProps) {
  const [recallResults, setRecallResults] = useState<Record<string, RecallResult>>({});
  const [recallLoading, setRecallLoading] = useState<Record<string, boolean>>({});

  const { data: stats } = useQuery<HealthStats>({
    queryKey: ["memory", "health-stats"],
    queryFn: async () => {
      const res = await fetch("/api/memory/health-stats");
      if (!res.ok) throw new Error("Failed to fetch memory health stats");
      const json = (await res.json()) as { data: HealthStats };
      return json.data;
    },
    staleTime: 60_000,
  });

  async function handleRecallTest(email: string) {
    setRecallLoading((prev) => ({ ...prev, [email]: true }));
    try {
      const res = await fetch("/api/memory/recall-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Recall test failed");
      const json = (await res.json()) as { data: RecallResult };
      setRecallResults((prev) => ({ ...prev, [email]: json.data }));
    } catch (err) {
      console.error("[MemoryHealth] recall test error:", err);
    } finally {
      setRecallLoading((prev) => ({ ...prev, [email]: false }));
    }
  }

  return (
    <div className="space-y-6">
      {stats && <StatsCards stats={stats} />}

      {stats && stats.topGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Memory Gaps</CardTitle>
            <CardDescription>
              High-engagement contacts with no Personize memories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topGaps.map((g) => (
                <Badge
                  key={g.id}
                  variant="outline"
                  className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25"
                >
                  {g.name} (score: {g.score})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Memory Table</CardTitle>
          <CardDescription>
            Top 50 contacts by engagement score with memory status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead>Last Memorized</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recall Test</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialContacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No contacts found
                  </TableCell>
                </TableRow>
              ) : (
                initialContacts.map((contact) => {
                  const cfg = statusConfig[contact.status];
                  return (
                    <TableRow
                      key={contact.id}
                      className={cn(
                        contact.status === "empty" &&
                          "bg-red-500/5 dark:bg-red-500/5",
                        contact.status === "partial" &&
                          "bg-amber-500/5 dark:bg-amber-500/5"
                      )}
                    >
                      <TableCell className="font-medium">
                        {contact.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.email ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {contact.score}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(contact.memorized_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cfg.className}>
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <RecallTestButton
                            email={contact.email}
                            result={recallResults[contact.email]}
                            loading={recallLoading[contact.email] ?? false}
                            onTest={handleRecallTest}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No email
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Re-export helpers for the server component
export { deriveStatus };
export type { ContactRow };
