"use client";

import { AlertTriangle, RotateCcw, MessageSquare } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

interface ModuleFallbackProps {
  moduleName: string;
  variant?: "compact" | "full";
  onRetry?: () => void;
}

export function ModuleFallback({
  moduleName,
  variant = "full",
  onRetry,
}: ModuleFallbackProps) {
  const [feedbackSent, setFeedbackSent] = useState(false);

  function handleReportIssue() {
    const eventId = Sentry.lastEventId();
    if (eventId) {
      Sentry.showReportDialog({ eventId });
    }
    setFeedbackSent(true);
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {moduleName} unavailable
          </p>
          <p className="text-xs text-muted-foreground">
            This section encountered an error.
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/20">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          {moduleName} encountered an error
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          This module crashed but your other dashboard sections are unaffected.
        </p>
        <div className="flex items-center justify-center gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </button>
          )}
          <button
            onClick={handleReportIssue}
            disabled={feedbackSent}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
          >
            <MessageSquare className="h-4 w-4" />
            {feedbackSent ? "Reported" : "Report Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}
