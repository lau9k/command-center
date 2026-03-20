import Link from "next/link";
import type { OutreachStats } from "@/app/api/outreach-stats/route";

const STAGES: {
  key: keyof Omit<OutreachStats, "total">;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}[] = [
  {
    key: "queued",
    label: "Queued",
    color: "bg-gray-400 dark:bg-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-800",
    textColor: "text-gray-700 dark:text-gray-300",
  },
  {
    key: "sent",
    label: "Sent",
    color: "bg-blue-500 dark:bg-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    textColor: "text-blue-700 dark:text-blue-300",
  },
  {
    key: "replied",
    label: "Replied",
    color: "bg-yellow-500 dark:bg-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-950",
    textColor: "text-yellow-700 dark:text-yellow-300",
  },
  {
    key: "no_response",
    label: "No Response",
    color: "bg-orange-500 dark:bg-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    textColor: "text-orange-700 dark:text-orange-300",
  },
  {
    key: "skipped",
    label: "Skipped",
    color: "bg-slate-400 dark:bg-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    textColor: "text-slate-700 dark:text-slate-300",
  },
];

export function OutreachFunnelCard({ stats }: { stats: OutreachStats }) {
  if (stats.total === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground">
          Outreach Funnel
        </h2>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No outreach tasks yet
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Outreach Funnel
        </h2>
        <span className="text-xs text-muted-foreground">
          {stats.total} total
        </span>
      </div>

      {/* Funnel bar */}
      <div className="mb-4 flex h-4 overflow-hidden rounded-full bg-muted">
        {STAGES.map((stage) => {
          const count = stats[stage.key];
          if (count === 0) return null;
          const pct = (count / stats.total) * 100;
          return (
            <Link
              key={stage.key}
              href={`/tasks?filter=outreach&status=${stage.key}`}
              className={`${stage.color} transition-opacity hover:opacity-80`}
              style={{ width: `${pct}%` }}
              title={`${stage.label}: ${count}`}
            />
          );
        })}
      </div>

      {/* Stage breakdown */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {STAGES.map((stage) => {
          const count = stats[stage.key];
          const pct =
            stats.total > 0
              ? Math.round((count / stats.total) * 100)
              : 0;
          return (
            <Link
              key={stage.key}
              href={`/tasks?filter=outreach&status=${stage.key}`}
              className={`rounded-lg ${stage.bgColor} px-3 py-2 transition-colors hover:opacity-80`}
            >
              <div className={`text-xs font-medium ${stage.textColor}`}>
                {stage.label}
              </div>
              <div className="mt-0.5 flex items-baseline gap-1">
                <span className="text-lg font-semibold text-foreground">
                  {count}
                </span>
                <span className="text-xs text-muted-foreground">{pct}%</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
