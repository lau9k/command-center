"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  Heart,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface RecallInteraction {
  text: string;
  timestamp: string | null;
  type: string;
  score: number;
}

interface RecallData {
  summary: string | null;
  painPoints: string[];
  interests: string[];
  recentInteractions: RecallInteraction[];
  totalMemories: number;
  query: string;
}

interface ContactContextCardProps {
  contactId: string;
  contactName: string;
}

function ContextSkeleton() {
  return (
    <div className="space-y-3">
      <div className="animate-pulse space-y-2 rounded-md border border-purple-500/20 bg-purple-500/5 p-3">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-5/6 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse space-y-2 rounded-md border border-border p-3"
        >
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function ContactContextCard({
  contactId,
  contactName,
}: ContactContextCardProps) {
  const [data, setData] = useState<RecallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecall = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/contacts/${encodeURIComponent(contactId)}/recall`
      );

      if (res.status === 503) {
        setError("not_configured");
        return;
      }

      if (!res.ok) {
        throw new Error("Recall failed");
      }

      const json = await res.json();
      setData(json.data as RecallData);
    } catch {
      setError("Failed to load context");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchRecall();
  }, [fetchRecall]);

  if (error === "not_configured") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="size-4 text-purple-500" />
            AI Context
          </CardTitle>
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

  if (error) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain className="size-4 text-purple-500" />
              AI Context
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={fetchRecall}
              title="Retry"
            >
              <RefreshCw className="size-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData =
    data &&
    (data.summary ||
      data.painPoints.length > 0 ||
      data.interests.length > 0 ||
      data.recentInteractions.length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Brain className="size-4 text-purple-500" />
            AI Context
          </CardTitle>
          {!loading && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={fetchRecall}
              title="Refresh context"
            >
              <RefreshCw className="size-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ContextSkeleton />
        ) : !hasData ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Brain className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No Personize data available for {contactName}.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Context will appear here as you interact with this contact.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* AI Summary */}
            {data.summary && (
              <div className="rounded-md border border-purple-500/20 bg-purple-500/5 p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400">
                  <Sparkles className="size-3" />
                  AI Summary
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {data.summary}
                </p>
              </div>
            )}

            {/* Pain Points */}
            {data.painPoints.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="size-3" />
                  Pain Points
                </div>
                <ul className="space-y-1">
                  {data.painPoints.map((point, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-orange-500/20 bg-orange-500/5 p-2 text-sm leading-relaxed text-foreground/90"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Interests */}
            {data.interests.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  <Heart className="size-3" />
                  Interests
                </div>
                <ul className="space-y-1">
                  {data.interests.map((interest, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-blue-500/20 bg-blue-500/5 p-2 text-sm leading-relaxed text-foreground/90"
                    >
                      {interest}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Interactions */}
            {data.recentInteractions.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <MessageSquare className="size-3" />
                  Recent Interactions
                </div>
                <ul className="space-y-1">
                  {data.recentInteractions.map((interaction, i) => (
                    <li
                      key={i}
                      className="space-y-1 rounded-md border border-border p-2 text-sm"
                    >
                      <p className="leading-relaxed text-foreground/90">
                        {interaction.text}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {interaction.type && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px]"
                          >
                            {interaction.type}
                          </Badge>
                        )}
                        {interaction.timestamp && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(interaction.timestamp).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Memory count */}
            {data.totalMemories > 0 && (
              <div className="pt-1 text-center text-[10px] text-muted-foreground">
                Based on {data.totalMemories} memories via Personize smartRecall
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
