"use client";

import { useEffect, useState, useCallback } from "react";
import type { SmartRecallItem } from "@/lib/personize/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface PersonizeMemoriesProps {
  contactId: string;
  contactEmail: string | null;
  open: boolean;
}

interface MemoryState {
  loading: boolean;
  memories: SmartRecallItem[];
  error: string | null;
}

const tierColors: Record<string, string> = {
  direct: "bg-green-500/15 text-green-700 dark:text-green-400",
  partial: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  might: "bg-muted text-muted-foreground",
};

function MemorySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
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
  );
}

export function PersonizeMemories({
  contactId,
  contactEmail,
  open,
}: PersonizeMemoriesProps) {
  const [memory, setMemory] = useState<MemoryState>({
    loading: false,
    memories: [],
    error: null,
  });

  const fetchMemories = useCallback(async (id: string) => {
    setMemory({ loading: true, memories: [], error: null });

    try {
      const res = await fetch(`/api/contacts/${id}/memory`);

      if (res.status === 503) {
        setMemory({ loading: false, memories: [], error: "not_configured" });
        return;
      }

      if (res.status === 422) {
        setMemory({ loading: false, memories: [], error: "no_email" });
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to fetch memories");
      }

      const json = await res.json();
      const memories = json.data?.memories ?? [];
      setMemory({ loading: false, memories, error: null });
    } catch {
      setMemory({
        loading: false,
        memories: [],
        error: "Memory service unavailable",
      });
    }
  }, []);

  useEffect(() => {
    if (contactId && open) {
      fetchMemories(contactId);
    } else {
      setMemory({ loading: false, memories: [], error: null });
    }
  }, [contactId, open, fetchMemories]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Personize Memories</CardTitle>
          </div>
          {!memory.loading && contactEmail && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => fetchMemories(contactId)}
              title="Refresh Memories"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {memory.loading ? (
          <MemorySkeleton />
        ) : memory.error === "not_configured" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Personize not configured
          </div>
        ) : memory.error === "no_email" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No email — cannot fetch memories
          </div>
        ) : memory.error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {memory.error}
          </div>
        ) : memory.memories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No memories found for this contact. Personize will surface
            relevant context here once memories are available.
          </p>
        ) : (
          <ul className="space-y-2">
            {memory.memories.map((item) => (
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
      </CardContent>
    </Card>
  );
}
