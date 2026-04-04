"use client";

import { useState } from "react";
import { TriangleAlertIcon, XIcon } from "lucide-react";

interface ApiErrorBannerProps {
  message?: string;
  onRetry?: () => void;
}

export function ApiErrorBanner({
  message = "Some data failed to load.",
  onRetry,
}: ApiErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <TriangleAlertIcon className="size-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 font-medium underline underline-offset-2 hover:no-underline"
        >
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 hover:bg-amber-200/50 dark:hover:bg-amber-800/50"
        aria-label="Dismiss"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
