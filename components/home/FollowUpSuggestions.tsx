"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Clock, Plus, X, RefreshCw, Sparkles } from "lucide-react";
import type { FollowUpSuggestion } from "@/app/api/suggestions/follow-ups/route";

const DISMISSED_KEY = "follow-up-suggestions-dismissed";

function getDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addDismissed(email: string): void {
  const current = getDismissed();
  if (!current.includes(email)) {
    current.push(email);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(current));
  }
}

export function FollowUpSuggestions() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const dismissed = getDismissed();
      const params = dismissed.length > 0 ? `?dismissed=${dismissed.join(",")}` : "";
      const res = await fetch(`/api/suggestions/follow-ups${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = (await res.json()) as { data: { suggestions: FollowUpSuggestion[] } };
      setSuggestions(json.data.suggestions);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSuggestions();
  }, [fetchSuggestions]);

  function handleDismiss(suggestion: FollowUpSuggestion) {
    if (suggestion.email) {
      addDismissed(suggestion.email);
    }
    setSuggestions((prev) => prev.filter((s) => s.email !== suggestion.email));
  }

  function handleCreateTask(suggestion: FollowUpSuggestion) {
    const title = encodeURIComponent(`Follow up with ${suggestion.name}`);
    const description = encodeURIComponent(
      `${suggestion.reason}${suggestion.company ? `\nCompany: ${suggestion.company}` : ""}${suggestion.email ? `\nEmail: ${suggestion.email}` : ""}`
    );
    router.push(`/tasks?new=true&title=${title}&description=${description}`);
  }

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-purple-500" />
            <h2 className="text-lg font-semibold text-foreground">Follow-Up Suggestions</h2>
          </div>
          <p className="text-xs text-muted-foreground">AI-powered reconnection recommendations</p>
        </div>
        <div className="space-y-2 px-4 pb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/50" />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-card">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-purple-500" />
            <h2 className="text-lg font-semibold text-foreground">Follow-Up Suggestions</h2>
          </div>
        </div>
        <div className="px-4 pb-4">
          <p className="text-center text-sm text-muted-foreground">
            Unable to load suggestions.{" "}
            <button
              type="button"
              onClick={() => void fetchSuggestions()}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <RefreshCw className="size-3" />
              Retry
            </button>
          </p>
        </div>
      </section>
    );
  }

  if (suggestions.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-purple-500" />
            <h2 className="text-lg font-semibold text-foreground">Follow-Up Suggestions</h2>
          </div>
        </div>
        <div className="px-4 pb-4">
          <p className="text-center text-xs text-muted-foreground">
            No follow-up suggestions right now — all contacts are recently engaged.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-purple-500" />
          <h2 className="text-lg font-semibold text-foreground">Follow-Up Suggestions</h2>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {suggestions.length} contact{suggestions.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Contacts that may need a follow-up based on email activity</p>
      </div>

      <div className="divide-y divide-border">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.email ?? suggestion.name}
            className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/30"
          >
            {/* Icon */}
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10">
              <Mail className="size-4 text-purple-600 dark:text-purple-400" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">
                  {suggestion.name}
                </span>
                {suggestion.company && (
                  <span className="truncate text-xs text-muted-foreground">
                    {suggestion.company}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {suggestion.reason}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:text-orange-400">
                  <Clock className="size-2.5" />
                  {suggestion.days_since_last}d ago
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {suggestion.gmail_threads} thread{suggestion.gmail_threads === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => handleCreateTask(suggestion)}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                title="Create follow-up task"
              >
                <Plus className="size-3" />
                Task
              </button>
              <button
                type="button"
                onClick={() => handleDismiss(suggestion)}
                className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Dismiss suggestion"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
