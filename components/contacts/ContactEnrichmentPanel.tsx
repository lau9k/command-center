"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Search,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
  Briefcase,
  MessageSquare,
  Clock,
  Zap,
  UserX,
} from "lucide-react";

interface DigestData {
  summary: string | null;
  properties: Record<string, string>;
  memories: Array<{ id: string; text: string; createdAt: string }>;
  tokenEstimate: number;
}

interface RecallItem {
  id: string;
  text: string;
  score: number;
  relevance_tier: "direct" | "partial" | "might";
  record_id: string | null;
  type: string;
  topic: string;
  timestamp: string | null;
}

interface EnrichmentData {
  digest: DigestData | null;
  recall: {
    query: string;
    memories: RecallItem[];
  };
}

interface ContactEnrichmentPanelProps {
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  contactCompany?: string | null;
  contactRole?: string | null;
  contactLinkedinUrl?: string | null;
  open: boolean;
}

const tierColors: Record<string, string> = {
  direct: "bg-green-500/15 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  might: "bg-muted text-muted-foreground",
};

const tierLabels: Record<string, string> = {
  direct: "Strong match",
  partial: "Partial match",
  might: "Possible match",
};

function EnrichmentSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {/* Summary block */}
      <div className="space-y-2 rounded-md border border-border p-4">
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-4 w-[70%] rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
      </div>
      {/* Property rows */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-1.5">
          <div className="size-4 shrink-0 rounded bg-muted" />
          <div className="h-4 w-3/5 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function PropertyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1.5">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function formatPropertyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const HIDDEN_PROPERTIES = new Set([
  "full_name",
  "name",
  "email",
  "record_id",
  "recordId",
  "id",
]);

export function ContactEnrichmentPanel({
  contactId,
  contactName,
  contactEmail,
  contactCompany,
  contactRole,
  contactLinkedinUrl,
  open,
}: ContactEnrichmentPanelProps) {
  const [data, setData] = useState<EnrichmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [recallLoading, setRecallLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [recallQuery, setRecallQuery] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchEnrichment = useCallback(
    async (query?: string) => {
      const isRecallSearch = !!query;
      if (isRecallSearch) {
        setRecallLoading(true);
      } else {
        setLoading(true);
        setError(null);
        setTimedOut(false);

        // 15-second client timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
        loadingTimeoutRef.current = setTimeout(() => {
          setTimedOut(true);
          setLoading(false);
        }, 15_000);
      }

      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);

        const res = await fetch(
          `/api/contacts/${encodeURIComponent(contactId)}/enrich?${params}`
        );

        if (res.status === 503) {
          setError("not_configured");
          return;
        }

        if (!res.ok) {
          throw new Error("Enrichment failed");
        }

        const json = await res.json();
        const enrichmentData = json.data as EnrichmentData;

        if (isRecallSearch && data) {
          // Only update recall results, keep digest
          setData({
            ...data,
            recall: enrichmentData.recall,
          });
        } else {
          setData(enrichmentData);
        }
      } catch {
        if (!isRecallSearch) {
          setError("Failed to load enrichment data");
        }
      } finally {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setLoading(false);
        setRecallLoading(false);
      }
    },
    [contactId, data]
  );

  useEffect(() => {
    if (contactId && open) {
      setData(null);
      setRecallQuery("");
      fetchEnrichment();
    }
  }, [contactId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRecallSearch = useCallback(
    (value: string) => {
      setRecallQuery(value);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      if (value.trim().length >= 2) {
        searchTimeoutRef.current = setTimeout(() => {
          fetchEnrichment(value.trim());
        }, 600);
      } else if (!value.trim() && data) {
        // Reset to original recall
        fetchEnrichment();
      }
    },
    [fetchEnrichment, data]
  );

  if (timedOut && !data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-purple-500" />
              Contact Enrichment
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => fetchEnrichment()}
              title="Retry"
            >
              <RefreshCw className="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <UserX className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No enrichment data available for this contact
            </p>
            <p className="text-xs text-muted-foreground/70">
              Personize may be slow to respond. Try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error === "not_configured") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-purple-500" />
              Contact Enrichment
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => fetchEnrichment()}
              title="Retry"
            >
              <RefreshCw className="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4" />
            Personize not configured
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && error !== "not_configured") {
    // Show local Supabase data as fallback instead of a red error
    const hasLocalData = contactEmail || contactCompany || contactRole || contactLinkedinUrl;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Zap className="size-4 text-purple-500" />
              Contact Enrichment
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => fetchEnrichment()}
              title="Retry"
            >
              <RefreshCw className="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="size-3.5" />
              Personize enrichment unavailable
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs"
              onClick={() => fetchEnrichment()}
            >
              <RefreshCw className="size-3" />
              Retry
            </Button>
          </div>
          {hasLocalData && (
            <div className="divide-y divide-border rounded-md border border-border px-3">
              {contactEmail && (
                <PropertyRow label="Email" value={contactEmail} />
              )}
              {contactCompany && (
                <PropertyRow label="Company" value={contactCompany} />
              )}
              {contactRole && (
                <PropertyRow label="Role" value={contactRole} />
              )}
              {contactLinkedinUrl && (
                <PropertyRow label="LinkedIn" value={contactLinkedinUrl} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const properties = data?.digest?.properties ?? {};
  const visibleProperties = Object.entries(properties).filter(
    ([key]) => !HIDDEN_PROPERTIES.has(key) && properties[key]
  );
  const recallMemories = data?.recall?.memories ?? [];
  const digestMemories = data?.digest?.memories ?? [];

  // Group recall memories by relevance tier
  const directMatches = recallMemories.filter((m) => m.relevance_tier === "direct");
  const partialMatches = recallMemories.filter((m) => m.relevance_tier === "partial");
  const weakMatches = recallMemories.filter((m) => m.relevance_tier === "might");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="size-4 text-purple-500" />
            Contact Enrichment
          </CardTitle>
          {!loading && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => fetchEnrichment()}
              title="Refresh enrichment data"
            >
              <RefreshCw className="size-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <EnrichmentSkeleton />
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="gap-1">
                <Sparkles className="size-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="recall" className="gap-1">
                <Brain className="size-3" />
                Recall
                {recallMemories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {recallMemories.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1">
                <Clock className="size-3" />
                History
                {digestMemories.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {digestMemories.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-3 pt-3">
              {/* AI Summary */}
              {data?.digest?.summary && (
                <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                    <Sparkles className="size-3" />
                    AI Summary
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {data.digest.summary}
                  </p>
                </div>
              )}

              {/* Enriched Properties */}
              {visibleProperties.length > 0 && (
                <div className="space-y-0.5">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Briefcase className="size-3" />
                    Profile Data
                  </div>
                  <div className="divide-y divide-border rounded-md border border-border px-3">
                    {visibleProperties.map(([key, value]) => (
                      <PropertyRow
                        key={key}
                        label={formatPropertyLabel(key)}
                        value={value}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              {(directMatches.length > 0 ||
                partialMatches.length > 0 ||
                digestMemories.length > 0) && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border border-border p-2 text-center">
                    <div className="text-lg font-bold text-foreground">
                      {recallMemories.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Recall Items
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-2 text-center">
                    <div className="text-lg font-bold text-foreground">
                      {digestMemories.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Memories
                    </div>
                  </div>
                  <div className="rounded-md border border-border p-2 text-center">
                    <div className="text-lg font-bold text-foreground">
                      {directMatches.length}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Strong Matches
                    </div>
                  </div>
                </div>
              )}

              {!data?.digest?.summary &&
                visibleProperties.length === 0 &&
                recallMemories.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <UserX className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No enrichment data available for this contact
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      {!contactEmail
                        ? "Add an email to enable Personize recall."
                        : "Memories and properties will appear here as interactions are recorded"}
                    </p>
                  </div>
                )}
            </TabsContent>

            {/* Recall Tab */}
            <TabsContent value="recall" className="space-y-3 pt-3">
              {/* Recall Search */}
              <div className="relative">
                {recallLoading ? (
                  <Loader2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-purple-500" />
                ) : (
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                  placeholder={`Search context about ${contactName}...`}
                  value={recallQuery}
                  onChange={(e) => handleRecallSearch(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>

              {/* Recall Results */}
              {recallMemories.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <MessageSquare className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {recallQuery
                      ? "No results for this query"
                      : "No recall data available"}
                  </p>
                  {!recallQuery && (
                    <p className="text-xs text-muted-foreground/70">
                      Try searching for topics, projects, or conversations
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { items: directMatches, tier: "direct" },
                    { items: partialMatches, tier: "partial" },
                    { items: weakMatches, tier: "might" },
                  ]
                    .filter(({ items }) => items.length > 0)
                    .map(({ items, tier }) => (
                      <div key={tier} className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${tierColors[tier]}`}
                          >
                            {tierLabels[tier]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({items.length})
                          </span>
                        </div>
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="space-y-1.5 rounded-md border border-border p-2.5 text-sm"
                          >
                            <p className="leading-relaxed text-foreground/90">
                              {item.text}
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10px] tabular-nums text-muted-foreground">
                                {(item.score * 100).toFixed(0)}%
                              </span>
                              {item.type && (
                                <Badge
                                  variant="outline"
                                  className="h-4 px-1.5 text-[10px]"
                                >
                                  {item.type}
                                </Badge>
                              )}
                              {item.topic && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[10px]"
                                >
                                  {item.topic}
                                </Badge>
                              )}
                              {item.timestamp && (
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(item.timestamp).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-2 pt-3">
              {digestMemories.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <Clock className="size-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No memory history available
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {digestMemories.map((mem) => (
                    <li
                      key={mem.id}
                      className="rounded-md border border-border p-2.5 text-sm"
                    >
                      <p className="leading-relaxed text-foreground/90">
                        {mem.text}
                      </p>
                      {mem.createdAt && (
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {new Date(mem.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
