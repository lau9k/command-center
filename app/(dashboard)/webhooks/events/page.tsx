"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Radio,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebhookEventFilters, type StatusFilter } from "@/components/webhooks/WebhookEventFilters";
import { WebhookEventDetail } from "@/components/webhooks/WebhookEventDetail";
import type { WebhookEvent } from "@/lib/webhook-events";

const PAGE_SIZE = 20;

function statusBadge(code: number) {
  if (code >= 200 && code < 300) {
    return (
      <Badge variant="outline" className="gap-1 border-green-500/30 text-green-500">
        <CheckCircle2 className="h-3 w-3" />
        {code}
      </Badge>
    );
  }
  if (code === 0) {
    return (
      <Badge variant="outline" className="gap-1 border-yellow-500/30 text-yellow-500">
        <Clock className="h-3 w-3" />
        Pending
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

export default function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filters
  const [status, setStatus] = useState<StatusFilter>("all");
  const [eventType, setEventType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Drawer
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status === "failed" ? "error" : status);
    if (eventType !== "all") params.set("event_type", eventType);
    if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
    if (dateTo) params.set("to", new Date(dateTo).toISOString());
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(page * PAGE_SIZE));

    try {
      const res = await fetch(`/api/webhooks/events?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as { data: WebhookEvent[]; total: number };
        setEvents(json.data ?? []);
        setTotal(json.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [status, eventType, dateFrom, dateTo, page]);

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

  function clearFilters() {
    setStatus("all");
    setEventType("all");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }

  async function handleRetry(id: string) {
    const res = await fetch(`/api/webhooks/events/${id}/retry`, {
      method: "POST",
    });
    if (res.ok) {
      const json = (await res.json()) as { data: WebhookEvent };
      setSelectedEvent(json.data);
      // Refresh list
      void fetchEvents();
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Webhook Event Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delivery history with status tracking and retry management ({total} events)
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

      {/* Filters */}
      <WebhookEventFilters
        status={status}
        onStatusChange={(s) => { setStatus(s); setPage(0); }}
        eventType={eventType}
        onEventTypeChange={(t) => { setEventType(t); setPage(0); }}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        onClearFilters={clearFilters}
      />

      {/* Events table */}
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 hidden md:table-cell">Endpoint</th>
                <th className="px-4 py-3 hidden sm:table-cell">Duration</th>
                <th className="px-4 py-3">Retries</th>
                <th className="px-4 py-3">Time</th>
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
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No webhook events found matching your filters.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="px-4 py-3">
                      {statusBadge(event.status_code)}
                    </td>
                    <td className="px-4 py-3">
                      {event.event_type ? (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {event.event_type}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {event.source}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate hidden md:table-cell">
                      {event.endpoint}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {event.duration_ms !== null
                        ? `${event.duration_ms}ms`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {event.retry_count > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-yellow-500">
                          <RotateCw className="h-3 w-3" />
                          {event.retry_count}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(event.created_at), {
                        addSuffix: true,
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      <WebhookEventDetail
        event={selectedEvent}
        open={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onRetry={handleRetry}
      />
    </div>
  );
}
