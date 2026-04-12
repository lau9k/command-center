import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthIssue {
  source: string;
  severity: "warn" | "error";
  message: string;
  last_success_at: string | null;
}

export interface HealthCheckResult {
  ok: boolean;
  checked_at: string;
  issues: HealthIssue[];
  sources: SourceStatus[];
}

export interface SourceStatus {
  source: string;
  status: "healthy" | "warn" | "error";
  last_success_at: string | null;
  records_found: number | null;
  records_synced: number | null;
  freshness_threshold_hours: number;
  hours_since_last_success: number | null;
}

// ---------------------------------------------------------------------------
// Source definitions
// ---------------------------------------------------------------------------

interface SourceConfig {
  source: string;
  freshness_hours: number;
  /** If true, also flag when records_found=0 on the latest success */
  warn_on_zero_records: boolean;
}

const SOURCES: SourceConfig[] = [
  { source: "gmail", freshness_hours: 8, warn_on_zero_records: false },
  { source: "kondo", freshness_hours: 24, warn_on_zero_records: false },
  { source: "granola", freshness_hours: 12, warn_on_zero_records: true },
  { source: "lateso", freshness_hours: 4, warn_on_zero_records: false },
  { source: "plaid", freshness_hours: 26, warn_on_zero_records: false },
];

// ---------------------------------------------------------------------------
// Core health check logic
// ---------------------------------------------------------------------------

export async function runHealthCheck(): Promise<HealthCheckResult> {
  const supabase = createServiceClient();
  const now = new Date();
  const issues: HealthIssue[] = [];
  const sources: SourceStatus[] = [];

  for (const config of SOURCES) {
    // Get last successful sync entry
    const { data: lastSuccess } = await supabase
      .from("sync_log")
      .select("completed_at, records_found, records_synced, status")
      .eq("source", config.source)
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    const lastSuccessAt = lastSuccess?.completed_at ?? null;
    let hoursSince: number | null = null;

    if (lastSuccessAt) {
      const lastDate = new Date(lastSuccessAt);
      hoursSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
    }

    // Determine status
    let status: "healthy" | "warn" | "error" = "healthy";

    if (!lastSuccessAt) {
      // Never synced successfully
      status = "error";
      issues.push({
        source: config.source,
        severity: "error",
        message: `No successful sync found for ${config.source}. The sync may have never run or always failed.`,
        last_success_at: null,
      });
    } else if (hoursSince !== null && hoursSince > config.freshness_hours * 2) {
      // More than 2x the threshold — critical
      status = "error";
      issues.push({
        source: config.source,
        severity: "error",
        message: `${config.source} sync is ${Math.round(hoursSince)}h stale (threshold: ${config.freshness_hours}h). Last success: ${lastSuccessAt}.`,
        last_success_at: lastSuccessAt,
      });
    } else if (hoursSince !== null && hoursSince > config.freshness_hours) {
      // Over threshold but not critical
      status = "warn";
      issues.push({
        source: config.source,
        severity: "warn",
        message: `${config.source} sync is ${Math.round(hoursSince)}h stale (threshold: ${config.freshness_hours}h). Last success: ${lastSuccessAt}.`,
        last_success_at: lastSuccessAt,
      });
    }

    // Check for zero-record success (silent failure pattern)
    if (
      config.warn_on_zero_records &&
      lastSuccess &&
      (lastSuccess.records_found === 0 || lastSuccess.records_found === null) &&
      status === "healthy"
    ) {
      status = "warn";
      issues.push({
        source: config.source,
        severity: "warn",
        message: `${config.source} last sync succeeded but found 0 records. Possible silent failure.`,
        last_success_at: lastSuccessAt,
      });
    }

    // Check for recent consecutive errors
    const { data: recentErrors } = await supabase
      .from("sync_log")
      .select("status")
      .eq("source", config.source)
      .order("completed_at", { ascending: false })
      .limit(3);

    if (recentErrors && recentErrors.length >= 3) {
      const allErrors = recentErrors.every((r) => r.status === "error");
      if (allErrors && status !== "error") {
        status = "error";
        issues.push({
          source: config.source,
          severity: "error",
          message: `${config.source} has 3+ consecutive errors in sync_log.`,
          last_success_at: lastSuccessAt,
        });
      }
    }

    sources.push({
      source: config.source,
      status,
      last_success_at: lastSuccessAt,
      records_found: lastSuccess?.records_found ?? null,
      records_synced: lastSuccess?.records_synced ?? null,
      freshness_threshold_hours: config.freshness_hours,
      hours_since_last_success: hoursSince !== null ? Math.round(hoursSince * 10) / 10 : null,
    });
  }

  return {
    ok: issues.length === 0,
    checked_at: now.toISOString(),
    issues,
    sources,
  };
}

// ---------------------------------------------------------------------------
// Notification helper with 4-hour dedup
// ---------------------------------------------------------------------------

const DEDUP_HOURS = 4;
const DEFAULT_USER_ID =
  process.env.DEFAULT_USER_ID ?? "de054c30-3eb0-4ffd-a661-200f4c2d5cf6";

/**
 * For each health issue, insert a notification ONLY if no notification
 * with the same source+issue_source combo exists in the last 4 hours.
 */
export async function alertOnIssues(issues: HealthIssue[]): Promise<number> {
  if (issues.length === 0) return 0;

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - DEDUP_HOURS * 60 * 60 * 1000).toISOString();
  let alerted = 0;

  for (const issue of issues) {
    // Dedup check: look for a recent notification with the same source tag
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("source", "ingest-health")
      .ilike("title", `%${issue.source}%`)
      .gte("created_at", cutoff)
      .limit(1);

    if (existing && existing.length > 0) {
      continue; // Already alerted within the dedup window
    }

    const { error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id: DEFAULT_USER_ID,
        title: `Ingest pipeline issue: ${issue.source}`,
        body: issue.message,
        type: issue.severity === "error" ? "alert" : "info",
        source: "ingest-health",
        action_url: "/admin",
      });

    if (!insertError) {
      alerted++;
    }
  }

  return alerted;
}
