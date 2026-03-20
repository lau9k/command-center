"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { SuggestedTask } from "@/app/api/ai/suggestions/route";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#22C55E",
};

export function AIFocusPanelLive() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/suggestions");
      if (res.ok) {
        const json = (await res.json()) as { data: SuggestedTask[] };
        setSuggestions(json.data);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 120_000);
    return () => clearInterval(interval);
  }, [fetchSuggestions]);

  const handleDismiss = (taskId: string) => {
    setDismissed((prev) => new Set(prev).add(taskId));
  };

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  return (
    <section className="flex-1">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-2 text-left"
      >
        {collapsed ? (
          <ChevronRight className="size-4 text-[#A855F7]" />
        ) : (
          <ChevronDown className="size-4 text-[#A855F7]" />
        )}
        <Sparkles className="size-4 text-[#A855F7]" />
        <h2 className="text-lg font-semibold text-foreground">
          What Needs Attention
        </h2>
        {!collapsed && visibleSuggestions.length > 0 && (
          <span className="rounded-full bg-[#A855F7]/10 px-2 py-0.5 text-xs font-medium text-[#A855F7]">
            {visibleSuggestions.length}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {loading && (
            <div className="flex items-center justify-center rounded-lg border border-border bg-card px-4 py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Analyzing priorities...
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-4 text-sm text-muted-foreground">
              <AlertCircle className="size-4 text-destructive" />
              <span>Could not load AI suggestions.</span>
              <button
                onClick={fetchSuggestions}
                className="ml-auto text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && visibleSuggestions.length === 0 && (
            <div className="rounded-lg border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              No urgent items right now. You&apos;re on track.
            </div>
          )}

          {!loading &&
            !error &&
            visibleSuggestions.map((task) => (
              <div
                key={task.id}
                className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-all duration-150 hover:border-ring/50 hover:bg-card-hover hover:shadow-sm cursor-pointer"
                onClick={() => router.push(`/tasks?id=${task.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/tasks?id=${task.id}`);
                  }
                }}
              >
                {/* Priority dot */}
                <div
                  className="mt-1.5 size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      PRIORITY_COLORS[task.priority] ?? "#6B7280",
                  }}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {task.title}
                    </span>
                    {task.projectName && (
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: task.projectColor
                            ? `${task.projectColor}20`
                            : "#A855F720",
                          color: task.projectColor ?? "#A855F7",
                        }}
                      >
                        {task.projectName}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {task.reason}
                  </p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(task.id);
                  }}
                  className="flex size-11 shrink-0 items-center justify-center rounded text-muted-foreground opacity-100 transition-opacity hover:bg-muted hover:text-foreground sm:size-auto sm:p-1 sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Dismiss suggestion: ${task.title}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
