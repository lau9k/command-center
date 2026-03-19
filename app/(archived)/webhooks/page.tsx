"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Radio,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PayloadInspector } from "@/components/webhooks/PayloadInspector";

interface WebhookEvent {
  id: string;
  source: string;
  endpoint: string;
  method: string;
  status_code: number;
  payload_preview: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

const SOURCES = ["all", "n8n", "telegram", "stripe", "github", "plaid"] as const;

function statusBadge(code: number) {
  if (code >= 200 && code < 300) {
    return (
      <Badge variant="outline" className="gap-1 border-green-500/30 text-green-500">
        <CheckCircle2 className="h-3 w-3" />
        {code}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-red-500/30 text-red-500">
      <AlertCircle className="h-3 w-3" />
      {code}
    </Badge>
  );
}

export default function WebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    if (source !== "all") params.set("source", source);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "50");

    try {
      const res = await fetch(`/api/webhooks/events?${params.toString()}`);
      if (res.ok) {
        const json = await res.json() as { data: WebhookEvent[]; total: number };
        setEvents(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [source, statusFilter]);

  useEffect(() => {
    setLoading(true);
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => void fetchEvents(), 5000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchEvents]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Webhook Monitor
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recent webhook events across all integrations ({total} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="gap-1.5"
          >
            <Radio
              className={cn("h-3.5 w-3.5", autoRefresh && "animate-pulse")}
            />
            {autoRefresh ? "Live" : "Auto-refresh"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchEvents()}
            disabled={loading}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Source filter buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        {SOURCES.map((s) => (
          <Button
            key={s}
            variant={source === s ? "default" : "outline"}
            size="sm"
            onClick={() => setSource(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}

        <span className="mx-2 h-4 w-px bg-border" />

        {(["all", "success", "error"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
            className="capitalize"
          >
            {s}
          </Button>
        ))}
      </div>

      {/* Events table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Payload</th>
              </tr>
            </thead>
            <tbody>
              {loading && events.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No webhook events found. Events will appear here as webhooks are received.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {event.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate">
                      {event.endpoint}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{event.method}</span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(event.status_code)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {event.duration_ms !== null ? `${event.duration_ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <PayloadInspector payload={event.payload_preview} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
