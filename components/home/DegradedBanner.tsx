"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { HomeStatsMeta } from "@/app/api/home-stats/route";

interface DegradedBannerProps {
  status: HomeStatsMeta["status"];
  reason?: string;
}

const DISMISS_KEY = "degraded-banner-dismissed";

export function DegradedBanner({ status, reason }: DegradedBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Re-show the banner when the status changes
  useEffect(() => {
    const stored = sessionStorage.getItem(DISMISS_KEY);
    if (stored === status) {
      setDismissed(true);
    } else {
      setDismissed(false);
    }
  }, [status]);

  if (status === "ok" || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, status);
    setDismissed(true);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 px-4 py-3 dark:bg-yellow-950/30 dark:border-yellow-600">
      <AlertTriangle className="size-5 shrink-0 text-yellow-600 dark:text-yellow-500" />
      <p className="flex-1 text-sm text-yellow-800 dark:text-yellow-200">
        Dashboard data may be incomplete &mdash; {reason ?? status}
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 text-yellow-600 transition-colors hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/50"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
