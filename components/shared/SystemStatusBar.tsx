"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const STORAGE_KEY = "dashboard-status-dismissed";

interface SystemStatusBarProps {
  status: "ok" | "rpc_missing" | "empty_data" | "error";
  reason?: string;
}

export function SystemStatusBar({ status, reason }: SystemStatusBarProps) {
  const [dismissed, setDismissed] = useState(false);

  // Clear dismissed flag when status changes
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== status) {
      localStorage.removeItem(STORAGE_KEY);
      setDismissed(false);
    } else if (stored === status) {
      setDismissed(true);
    }
  }, [status]);

  if (status === "ok" || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, status);
    setDismissed(true);
  }

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-yellow-300 bg-yellow-50 px-4 py-2.5 text-sm text-yellow-900 dark:border-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-200"
      style={{ borderLeft: "4px solid var(--tw-border-opacity, 1)" }}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">
        Dashboard Status: {reason ?? "The dashboard is operating in a degraded state."}
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-yellow-200/60 dark:hover:bg-yellow-800/40"
        aria-label="Dismiss status message"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
