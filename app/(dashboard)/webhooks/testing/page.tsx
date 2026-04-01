"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WebhookTester } from "@/components/webhooks/WebhookTester";
import { WebhookPayloadViewer } from "@/components/webhooks/WebhookPayloadViewer";
import type { WebhookEvent } from "@/lib/webhook-events";

const PAGE_SIZE = 20;

function StatusBadge({ statusCode }: { statusCode: number }) {
  if (statusCode >= 200 && statusCode < 300) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-500/30 text-green-500"
      >
        <CheckCircle2 className="h-3 w-3" />
        {statusCode}
      </Badge>
    );
  }
  if (statusCode === 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-yellow-500/30 text-yellow-500"
      >
        <Clock className="h-3 w-3" />
        Pending
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-red-500/30 text-red-500"
    >
      <AlertCircle className="h-3 w-3" />
      {statusCode}
    </Badge>
  );
}

export default function WebhookTestingPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/webhooks/events?limit=${PAGE_SIZE}&offset=0`
      );
      const json = (await res.json()) as { data: WebhookEvent[] };
      setEvents(json.data ?? []);
    } catch {
      // silent fail - events will show as empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const handleReplay = useCallback(
    async (event: WebhookEvent) => {
      setReplayingId(event.id);
      try {
        const res = await fetch("/api/webhooks/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: event.endpoint,
            event_type: event.event_type ?? "unknown",
            payload: event.body ?? { raw: event.payload_preview },
          }),
        });

        if (res.ok) {
          await fetchEvents();
        }
      } finally {
        setReplayingId(null);
      }
    },
    [fetchEvents]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Webhook Testing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send test payloads to webhook endpoints and replay past events.
        </p>
      </div>

      {/* Tester */}
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-medium mb-4">Send Test Payload</h2>
        <WebhookTester onTestSent={() => void fetchEvents()} />
      </div>

      {/* Recent Events */}
      <div className="rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-medium">Recent Events</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchEvents()}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-md bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No webhook events yet. Send a test payload above to get started.
          </div>
        ) : (
          <div className="divide-y">
            {events.map((event) => (
              <div key={event.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusBadge statusCode={event.status_code} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {event.event_type && (
                          <Badge
                            variant="secondary"
                            className="font-mono text-xs shrink-0"
                          >
                            {event.event_type}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          {event.endpoint}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(event.created_at), {
                          addSuffix: true,
                        })}
                        {event.duration_ms !== null && (
                          <span className="ml-2">{event.duration_ms}ms</span>
                        )}
                        {event.source && (
                          <span className="ml-2">via {event.source}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedEventId(
                          expandedEventId === event.id ? null : event.id
                        )
                      }
                      className="text-xs"
                    >
                      {expandedEventId === event.id ? "Hide" : "Details"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleReplay(event)}
                      disabled={replayingId === event.id}
                      className="gap-1.5"
                    >
                      <RotateCw
                        className={cn(
                          "h-3.5 w-3.5",
                          replayingId === event.id && "animate-spin"
                        )}
                      />
                      {replayingId === event.id ? "Replaying..." : "Replay"}
                    </Button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedEventId === event.id && (
                  <div className="mt-4 space-y-3 pl-4 border-l-2 border-muted">
                    {event.error_message && (
                      <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                        <p className="text-xs text-red-400">
                          {event.error_message}
                        </p>
                      </div>
                    )}
                    {(event.body ?? event.payload_preview) && (
                      <WebhookPayloadViewer
                        data={
                          event.body ??
                          (event.payload_preview as string | null)
                        }
                        label="Request Payload"
                        defaultExpanded={false}
                      />
                    )}
                    {event.response && (
                      <WebhookPayloadViewer
                        data={event.response}
                        label="Response"
                        defaultExpanded={false}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
