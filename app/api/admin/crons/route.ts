import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CronJobConfig {
  source: string;
  label: string;
  schedule: string;
}

interface CronJobStatus {
  source: string;
  label: string;
  schedule: string;
  lastRun: {
    id: string;
    status: "success" | "error" | "partial" | "running";
    started_at: string;
    finished_at: string | null;
    records_synced: number | null;
    error_message: string | null;
  } | null;
  nextScheduled: string | null;
}

// ---------------------------------------------------------------------------
// Cron schedule config — mirrors vercel.json + known sync sources
// ---------------------------------------------------------------------------

const CRON_JOBS: CronJobConfig[] = [
  { source: "plaid", label: "Plaid Financial Sync", schedule: "0 8 * * *" },
  { source: "gmail", label: "Gmail Sync", schedule: "0 */4 * * *" },
  { source: "granola", label: "Granola Meeting Sync", schedule: "0 9 * * *" },
];

// ---------------------------------------------------------------------------
// Cron schedule parser — computes next run from a simple cron expression
// Supports: "minute hour * * *" and "minute */N * * *" patterns
// ---------------------------------------------------------------------------

function getNextCronRun(schedule: string, after: Date): string {
  const [minuteStr, hourStr] = schedule.split(" ");
  const minute = parseInt(minuteStr, 10);
  const next = new Date(after);
  next.setSeconds(0, 0);

  if (hourStr.startsWith("*/")) {
    // Repeating hours pattern, e.g. "0 */4 * * *"
    const interval = parseInt(hourStr.slice(2), 10);
    next.setMinutes(minute);

    // Find the next matching hour
    const currentHour = next.getHours();
    const currentMinute = next.getMinutes();
    let nextHour = Math.ceil(after.getHours() / interval) * interval;

    // If we're past the minute mark for this hour slot, go to next slot
    if (nextHour === currentHour && after.getMinutes() >= currentMinute) {
      nextHour += interval;
    }

    if (nextHour >= 24) {
      next.setDate(next.getDate() + 1);
      next.setHours(0, minute);
    } else {
      next.setHours(nextHour, minute);
    }
  } else {
    // Fixed hour pattern, e.g. "0 8 * * *"
    const hour = parseInt(hourStr, 10);
    next.setHours(hour, minute);

    if (next <= after) {
      next.setDate(next.getDate() + 1);
    }
  }

  return next.toISOString();
}

// ---------------------------------------------------------------------------
// GET /api/admin/crons
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();
  const now = new Date();

  // Fetch the latest sync_log entry for each known source
  const results: CronJobStatus[] = await Promise.all(
    CRON_JOBS.map(async (job) => {
      const { data } = await supabase
        .from("sync_log")
        .select(
          "id, status, started_at, completed_at, records_synced, error_message"
        )
        .eq("source", job.source)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastRun = data
        ? {
            id: String(data.id),
            status: String(data.status) as
              | "success"
              | "error"
              | "partial"
              | "running",
            started_at: String(data.started_at),
            finished_at: data.completed_at
              ? String(data.completed_at)
              : null,
            records_synced: data.records_synced as number | null,
            error_message: data.error_message
              ? String(data.error_message)
              : null,
          }
        : null;

      return {
        source: job.source,
        label: job.label,
        schedule: job.schedule,
        lastRun,
        nextScheduled: getNextCronRun(job.schedule, now),
      };
    })
  );

  return NextResponse.json({ data: results, timestamp: now.toISOString() });
});
