"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

const REFRESH_INTERVAL_MS = 30_000;

interface ActivityLogRow {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function EntityIcon({ entityType }: { entityType: string }) {
  const iconClass = "size-4 shrink-0";
  switch (entityType) {
    case "task":
      return <CheckSquare className={cn(iconClass, "text-[#3B82F6]")} />;
    case "content_post":
      return <FileText className={cn(iconClass, "text-[#A855F7]")} />;
    case "contact":
      return <Users className={cn(iconClass, "text-[#22C55E]")} />;
    case "conversation":
      return <MessageCircle className={cn(iconClass, "text-[#F97316]")} />;
    case "sponsor":
      return <Handshake className={cn(iconClass, "text-[#EAB308]")} />;
    case "transaction":
      return <CreditCard className={cn(iconClass, "text-[#EF4444]")} />;
    case "event":
      return <Calendar className={cn(iconClass, "text-[#0088CC]")} />;
    default:
      return <Activity className={cn(iconClass, "text-muted-foreground")} />;
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "created": return "Created";
    case "updated": return "Updated";
    case "deleted": return "Deleted";
    case "ingested": return "Ingested";
    case "synced": return "Synced";
    default: return action;
  }
}

function entityTypeLabel(entityType: string): string {
  switch (entityType) {
    case "content_post": return "content";
    default: return entityType;
  }
}

interface LiveActivityStreamProps {
  initial: ActivityLogRow[];
}

export function LiveActivityStream({ initial }: LiveActivityStreamProps) {
  const [entries, setEntries] = useState<ActivityLogRow[]>(initial);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchActivity = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/activity?limit=15");
      if (res.ok) {
        const json = (await res.json()) as { data: ActivityLogRow[] };
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

  if (entries.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Live Activity</h2>
        <EmptyState
          title="No activity yet"
          description="Actions across tasks, contacts, and content will appear here in real time."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">Live Activity</h2>
        {isRefreshing && (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="rounded-lg border border-border bg-card">
        <ul className="divide-y divide-border">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
            >
              <EntityIcon entityType={entry.entity_type} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {actionLabel(entry.action)}
                  </span>
                  <span className="truncate text-sm text-foreground">
                    {entry.entity_name ?? `${entityTypeLabel(entry.entity_type)} record`}
                  </span>
                </div>
                {entry.source !== "manual" && (
                  <span className="text-[11px] text-muted-foreground sm:hidden">
                    via {entry.source}
                  </span>
                )}
              </div>
              {entry.source !== "manual" && (
                <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                  via {entry.source}
                </span>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">
                {relativeTime(entry.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
