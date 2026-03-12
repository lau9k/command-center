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
      <div className="w-full max-w-md rounded-lg border border-[#2A2A2A] bg-[#141414] p-8 text-center dark:border-[#2A2A2A] dark:bg-[#141414] light:border-[#E5E5E5] light:bg-white">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#EF4444]/20">
          <AlertTriangle className="h-6 w-6 text-[#EF4444]" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] [html[data-theme=light]_&]:text-[#171717]">
          Something went wrong
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-[#A0A0A0] dark:text-[#A0A0A0] [html[data-theme=light]_&]:text-[#636363]">
          This module encountered an error. Your other dashboard pages are
          unaffected.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-2 text-sm font-medium text-[#F5F5F5] transition-colors hover:bg-[#2A2A2A] dark:border-[#2A2A2A] dark:bg-[#1E1E1E] dark:hover:bg-[#2A2A2A] [html[data-theme=light]_&]:border-[#E5E5E5] [html[data-theme=light]_&]:bg-[#F5F5F5] [html[data-theme=light]_&]:text-[#171717] [html[data-theme=light]_&]:hover:bg-[#E5E5E5]"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={handleReportIssue}
            disabled={feedbackSent}
            className="inline-flex items-center gap-2 rounded-md border border-[#2A2A2A] bg-[#1E1E1E] px-4 py-2 text-sm font-medium text-[#F5F5F5] transition-colors hover:bg-[#2A2A2A] disabled:opacity-50 dark:border-[#2A2A2A] dark:bg-[#1E1E1E] dark:hover:bg-[#2A2A2A] [html[data-theme=light]_&]:border-[#E5E5E5] [html[data-theme=light]_&]:bg-[#F5F5F5] [html[data-theme=light]_&]:text-[#171717] [html[data-theme=light]_&]:hover:bg-[#E5E5E5]"
          >
            <MessageSquare className="h-4 w-4" />
            {feedbackSent ? "Reported" : "Report Issue"}
          </button>
        </div>
      </div>
    </div>
  );
}
