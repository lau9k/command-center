"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare,
  FileText,
  Users,
  MessageCircle,
  Handshake,
  CreditCard,
  Calendar,
  Activity,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REFRESH_INTERVAL_MS = 30_000;

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface RecentActivityFeedProps {
  initial: ActivityEntry[];
}

function relativeTime(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EntityIcon({ entityType }: { entityType: string }) {
  const base = "size-4 shrink-0";
  switch (entityType) {
    case "task":
      return <CheckSquare className={cn(base, "text-[#3B82F6]")} />;
    case "content_post":
      return <FileText className={cn(base, "text-[#A855F7]")} />;
    case "contact":
      return <Users className={cn(base, "text-[#22C55E]")} />;
    case "conversation":
      return <MessageCircle className={cn(base, "text-[#F97316]")} />;
    case "sponsor":
      return <Handshake className={cn(base, "text-[#EAB308]")} />;
    case "transaction":
      return <CreditCard className={cn(base, "text-[#EF4444]")} />;
    case "event":
      return <Calendar className={cn(base, "text-[#0088CC]")} />;
    default:
      return <Activity className={cn(base, "text-muted-foreground")} />;
  }
}

function entityLink(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "task":
      return `/tasks/${entityId}`;
    case "content_post":
      return `/content/${entityId}`;
    case "contact":
      return `/contacts/${entityId}`;
    case "conversation":
      return `/conversations/${entityId}`;
    case "sponsor":
      return `/sponsors/${entityId}`;
    case "transaction":
      return `/finance`;
    default:
      return null;
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "created":
      return "Created";
    case "updated":
      return "Updated";
    case "deleted":
      return "Deleted";
    case "ingested":
      return "Ingested";
    case "synced":
      return "Synced";
    default:
      return action;
  }
}

function entityTypeLabel(entityType: string): string {
  switch (entityType) {
    case "content_post":
      return "content";
    default:
      return entityType;
  }
}

export function RecentActivityFeed({ initial }: RecentActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>(initial.slice(0, 10));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivity = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/activity?limit=10");
      if (res.ok) {
        const json = (await res.json()) as { data: ActivityEntry[] };
        setEntries(json.data);
      }
    } catch {
      // Keep showing last known data
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchActivity, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
            Recent Activity
          </h2>
          {isRefreshing && (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Link
          href="/activity"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center dark:border-border dark:bg-card">
          <Activity className="mx-auto size-8 text-muted-foreground dark:text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
            No recent activity. Actions across tasks, contacts, and content will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card dark:border-border dark:bg-card">
          <ul className="divide-y divide-border dark:divide-border">
            {entries.map((entry) => {
              const href = entityLink(entry.entity_type, entry.entity_id);
              const description = `${actionLabel(entry.action)} ${entityTypeLabel(entry.entity_type)}`;
              const name = entry.entity_name ?? `${entityTypeLabel(entry.entity_type)} record`;

              const content = (
                <li
                  key={entry.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    href && "hover:bg-muted/30 dark:hover:bg-muted/30"
                  )}
                >
                  <EntityIcon entityType={entry.entity_type} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground dark:text-foreground">
                      <span className="font-medium">{description}</span>
                      {" \u2014 "}
                      <span className="text-muted-foreground dark:text-muted-foreground">
                        {name}
                      </span>
                    </p>
                  </div>

                  {entry.source !== "manual" && (
                    <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-muted dark:text-muted-foreground sm:inline">
                      {entry.source}
                    </span>
                  )}

                  <span className="shrink-0 text-xs text-muted-foreground dark:text-muted-foreground">
                    {relativeTime(entry.created_at)}
                  </span>
                </li>
              );

              if (href) {
                return (
                  <Link key={entry.id} href={href} className="block">
                    {content}
                  </Link>
                );
              }
              return content;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
