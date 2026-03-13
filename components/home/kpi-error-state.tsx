"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

interface KpiErrorStateProps {
  onRetry: () => void;
}

export function KpiErrorState({ onRetry }: KpiErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center">
      <AlertCircle className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Failed to load metrics. Please try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <RefreshCw className="size-4" />
        Retry
      </button>
    </div>
  );
}
