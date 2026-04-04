"use client";

import { toast } from "sonner";

const THROTTLE_WINDOW_MS = 10_000;
const MAX_TOASTS_PER_WINDOW = 3;

let recentTimestamps: number[] = [];

function isThrottled(): boolean {
  const now = Date.now();
  recentTimestamps = recentTimestamps.filter(
    (t) => now - t < THROTTLE_WINDOW_MS,
  );
  if (recentTimestamps.length >= MAX_TOASTS_PER_WINDOW) return true;
  recentTimestamps.push(now);
  return false;
}

/**
 * Show an error toast when an API query fails.
 * Throttled to max 3 toasts per 10 seconds to prevent floods.
 *
 * @param label  Human-readable module name (e.g. "Tasks", "Projects")
 * @param error  The caught error (logged in dev only)
 * @param onRetry Optional callback to retry the failed operation
 */
export function notifyApiError(
  label: string,
  error: unknown,
  onRetry?: () => void,
): void {
  if (process.env.NODE_ENV === "development") {
    console.error(`[API Error] ${label}:`, error);
  }

  if (isThrottled()) return;

  toast.error(`${label}: Data may be incomplete`, {
    description: "Something went wrong loading this data.",
    action: onRetry
      ? { label: "Retry", onClick: onRetry }
      : undefined,
  });
}
