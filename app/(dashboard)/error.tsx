"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, MessageSquare } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [feedbackSent, setFeedbackSent] = useState(false);

  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        page: "dashboard",
        module: "dashboard",
      },
    });
  }, [error]);

  function handleReportIssue() {
    const eventId = Sentry.lastEventId();
    if (eventId) {
      Sentry.showReportDialog({ eventId });
    }
    setFeedbackSent(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/20">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          This module encountered an error. Your other dashboard pages are
          unaffected.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
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
