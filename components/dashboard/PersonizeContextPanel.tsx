"use client";

import { useEffect, useState, useCallback } from "react";
import type { SmartRecallItem } from "@/lib/personize/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonizeContextPanelProps {
  contactId: string;
}

interface ContextState {
  loading: boolean;
  memories: SmartRecallItem[];
  digest: string | null;
  lastInteraction: string | null;
  error: string | null;
}

const tierColors: Record<string, string> = {
  direct: "bg-green-500/15 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  might: "bg-muted text-muted-foreground",
};

function ContextSkeleton() {
  return (
    <div className="space-y-3">
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse space-y-2 rounded-md border border-border p-3"
          >
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="flex gap-2">
              <div className="h-5 w-12 rounded-full bg-muted" />
              <div className="h-5 w-16 rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonizeContextPanel({ contactId }: PersonizeContextPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [context, setContext] = useState<ContextState>({
    loading: false,
    memories: [],
    digest: null,
    lastInteraction: null,
    error: null,
  });
  const [hasFetched, setHasFetched] = useState(false);

  const fetchContext = useCallback(async () => {
    setContext((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch(`/api/personize/context?contact_id=${contactId}`);

      if (res.status === 503) {
        setContext({ loading: false, memories: [], digest: null, lastInteraction: null, error: "not_configured" });
        return;
      }

      if (res.status === 422) {
        setContext({ loading: false, memories: [], digest: null, lastInteraction: null, error: "no_email" });
        return;
      }

      if (res.status === 404) {
        setContext({ loading: false, memories: [], digest: null, lastInteraction: null, error: "unavailable" });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch context");
      }

      const json = await res.json();
      const data = json.data;
      setContext({
        loading: false,
        memories: data.memories ?? [],
        digest: data.digest ?? null,
        lastInteraction: data.lastInteraction ?? null,
        error: null,
      });
    } catch {
      setContext({
        loading: false,
        memories: [],
        digest: null,
        lastInteraction: null,
        error: "Failed to load Personize context",
      });
    }
  }, [contactId]);

  useEffect(() => {
    if (expanded && !hasFetched) {
      setHasFetched(true);
      fetchContext();
    }
  }, [expanded, hasFetched, fetchContext]);

  // Reset when contactId changes
  useEffect(() => {
    setExpanded(false);
    setHasFetched(false);
    setContext({ loading: false, memories: [], digest: null, lastInteraction: null, error: null });
  }, [contactId]);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500 dark:text-purple-400" />
            <CardTitle className="text-sm">Personize Context</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {expanded && !context.loading && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchContext();
                }}
                title="Refresh"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      <div
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="pt-0">
            {context.loading ? (
              <ContextSkeleton />
            ) : context.error === "not_configured" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                Personize not configured
              </div>
            ) : context.error === "no_email" ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                No email — cannot fetch memories
              </div>
            ) : context.error === "unavailable" ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Personize context unavailable — check API connection
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchContext();
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            ) : context.error ? (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Personize context unavailable — check API connection
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchContext();
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </Button>
              </div>
            ) : !hasFetched ? null : context.memories.length === 0 && !context.digest ? (
              <p className="text-sm text-muted-foreground">
                No Personize memories found for this contact.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Relationship digest */}
                {context.digest && (
                  <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-3 dark:bg-purple-500/10">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {context.digest}
                    </p>
                  </div>
                )}

                {/* Last interaction */}
                {context.lastInteraction && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Last interaction:{" "}
                      {new Date(context.lastInteraction).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Memory cards */}
                {context.memories.length > 0 && (
                  <ul className="space-y-2">
                    {context.memories.map((item) => (
                      <li
                        key={item.id}
                        className="space-y-1.5 rounded-md border border-border p-3 text-sm"
                      >
                        <p>{item.text}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tierColors[item.relevance_tier] ?? tierColors.might}`}
                          >
                            {item.score.toFixed(2)}
                          </span>
                          {item.type && (
                            <Badge variant="outline" className="text-xs">
                              {item.type}
                            </Badge>
                          )}
                          {item.topic && (
                            <Badge variant="secondary" className="text-xs">
                              {item.topic}
                            </Badge>
                          )}
                          {item.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.timestamp).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </Card>
  );
}
