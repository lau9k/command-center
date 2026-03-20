"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  MessageSquare,
  Calendar,
  StickyNote,
  Lightbulb,
  Clock,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeText } from "@/lib/sanitize";

interface RecallMemory {
  text: string;
  timestamp: string | null;
  type: string;
  score: number;
}

interface RecallResponse {
  data: {
    summary: string | null;
    painPoints: string[];
    interests: string[];
    recentInteractions: RecallMemory[];
    totalMemories: number;
    query: string;
  };
}

type MemoryType = "interaction" | "note" | "decision" | "meeting";

interface TimelineEntry {
  id: string;
  text: string;
  timestamp: string | null;
  type: MemoryType;
  score: number;
}

function classifyMemoryType(type: string, text: string): MemoryType {
  const lower = text.toLowerCase();
  if (type === "meeting" || lower.includes("meeting") || lower.includes("call with")) {
    return "meeting";
  }
  if (type === "conversation" || type === "email") {
    return "interaction";
  }
  if (
    lower.includes("decided") ||
    lower.includes("decision") ||
    lower.includes("agreed") ||
    lower.includes("commit")
  ) {
    return "decision";
  }
  return "note";
}

const typeConfig: Record<
  MemoryType,
  { icon: React.ElementType; color: string; label: string }
> = {
  interaction: {
    icon: MessageSquare,
    color: "bg-blue-500",
    label: "Interaction",
  },
  note: { icon: StickyNote, color: "bg-amber-500", label: "Note" },
  decision: { icon: Lightbulb, color: "bg-emerald-500", label: "Decision" },
  meeting: { icon: Calendar, color: "bg-purple-500", label: "Meeting" },
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

const CONTENT_TRUNCATE_LENGTH = 150;

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const sanitized = sanitizeText(text);
  const needsTruncation = sanitized.length > CONTENT_TRUNCATE_LENGTH;

  if (!needsTruncation) {
    return <p className="mt-1 text-sm leading-snug">{sanitized}</p>;
  }

  return (
    <div className="mt-1">
      <p className="text-sm leading-snug">
        {expanded ? sanitized : sanitized.slice(0, CONTENT_TRUNCATE_LENGTH) + "..."}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <>
            Show less <ChevronUp className="size-3" />
          </>
        ) : (
          <>
            Show more <ChevronDown className="size-3" />
          </>
        )}
      </button>
    </div>
  );
}

interface ContactMemoryTimelineProps {
  contactId: string;
}

export function ContactMemoryTimeline({ contactId }: ContactMemoryTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalMemories, setTotalMemories] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchMemories() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/contacts/${contactId}/recall`);

        if (res.status === 503) {
          setError("not_configured");
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch memories");
        }

        const json: RecallResponse = await res.json();
        const { recentInteractions, painPoints, interests, totalMemories: total } = json.data;

        if (cancelled) return;

        const timeline: TimelineEntry[] = [];

        for (const interaction of recentInteractions) {
          timeline.push({
            id: `int-${interaction.timestamp ?? timeline.length}-${interaction.score}`,
            text: interaction.text,
            timestamp: interaction.timestamp,
            type: classifyMemoryType(interaction.type, interaction.text),
            score: interaction.score,
          });
        }

        for (let i = 0; i < painPoints.length; i++) {
          timeline.push({
            id: `pain-${i}`,
            text: painPoints[i],
            timestamp: null,
            type: "note",
            score: 0,
          });
        }

        for (let i = 0; i < interests.length; i++) {
          timeline.push({
            id: `interest-${i}`,
            text: interests[i],
            timestamp: null,
            type: "note",
            score: 0,
          });
        }

        // Sort: entries with timestamps first (most recent), then entries without timestamps
        timeline.sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          }
          if (a.timestamp) return -1;
          if (b.timestamp) return 1;
          return 0;
        });

        setEntries(timeline);
        setTotalMemories(total);
      } catch {
        if (!cancelled) {
          setError("Failed to load memory timeline");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMemories();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <Brain className="size-4 text-muted-foreground" />
            Memory Timeline
          </span>
          {totalMemories > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {totalMemories} memories
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading memories...
            </div>
          </div>
        ) : error === "not_configured" ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="size-4" />
              Personize not configured
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Clock className="mx-auto mb-2 size-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No memories found for this contact yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="relative space-y-0">
            {entries.map((entry, idx) => {
              const config = typeConfig[entry.type];
              const Icon = config.icon;
              const isLast = idx === entries.length - 1;

              return (
                <div key={entry.id} className="relative flex gap-3 pb-5">
                  {!isLast && (
                    <div className="absolute left-[13px] top-7 h-[calc(100%-14px)] w-px bg-border" />
                  )}
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.color}`}
                  >
                    <Icon className="size-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span
                          className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                            entry.type === "interaction"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                              : entry.type === "meeting"
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-400"
                                : entry.type === "decision"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {config.label}
                        </span>
                        <ExpandableText text={entry.text} />
                      </div>
                      {entry.timestamp && (
                        <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
