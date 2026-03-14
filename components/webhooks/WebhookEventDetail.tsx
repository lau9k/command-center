"use client";

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Copy,
  Check,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WebhookEvent } from "@/lib/webhook-events";

interface WebhookEventDetailProps {
  event: WebhookEvent | null;
  open: boolean;
  onClose: () => void;
  onRetry: (id: string) => Promise<void>;
}

function StatusIcon({ statusCode }: { statusCode: number }) {
  if (statusCode >= 200 && statusCode < 300) {
    return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  }
  if (statusCode === 0) {
    return <Clock className="h-5 w-5 text-yellow-500" />;
  }
  return <AlertCircle className="h-5 w-5 text-red-500" />;
}

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const formatted = typeof data === "string" ? data : JSON.stringify(data, null, 2);

  function handleCopy() {
    void navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </h4>
        <Button variant="ghost" size="icon-xs" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <pre className="rounded-md border bg-muted/50 p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
        {formatted}
      </pre>
    </div>
  );
}

export function WebhookEventDetail({
  event,
  open,
  onClose,
  onRetry,
}: WebhookEventDetailProps) {
  const [retrying, setRetrying] = useState(false);

  if (!event) {
    return <Drawer open={open} onClose={onClose} title="Event Details"><div /></Drawer>;
  }

  const isFailed =
    event.status_code < 200 || event.status_code >= 300;

  async function handleRetry() {
    if (!event) return;
    setRetrying(true);
    try {
      await onRetry(event.id);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Event Details"
      footer={
        isFailed ? (
          <Button
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="gap-1.5"
          >
            <RotateCw
              className={cn("h-3.5 w-3.5", retrying && "animate-spin")}
            />
            {retrying ? "Retrying..." : "Retry Delivery"}
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Status header */}
        <div className="flex items-center gap-3">
          <StatusIcon statusCode={event.status_code} />
          <div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  event.status_code >= 200 && event.status_code < 300
                    ? "border-green-500/30 text-green-500"
                    : event.status_code === 0
                      ? "border-yellow-500/30 text-yellow-500"
                      : "border-red-500/30 text-red-500"
                )}
              >
                {event.status_code === 0 ? "Pending" : event.status_code}
              </Badge>
              {event.event_type && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {event.event_type}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Source</span>
            <p className="font-mono text-xs">{event.source}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Method</span>
            <p className="font-mono text-xs">{event.method}</p>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-muted-foreground">Endpoint</span>
            <p className="font-mono text-xs break-all">{event.endpoint}</p>
          </div>
          {event.duration_ms !== null && (
            <div>
              <span className="text-xs text-muted-foreground">Duration</span>
              <p className="text-xs">{event.duration_ms}ms</p>
            </div>
          )}
          <div>
            <span className="text-xs text-muted-foreground">Created</span>
            <p className="text-xs">
              {format(new Date(event.created_at), "MMM d, yyyy HH:mm:ss")}
            </p>
          </div>
        </div>

        {/* Retry info */}
        {(event.retry_count > 0 || event.last_retry_at) && (
          <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3 space-y-1">
            <h4 className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              Retry Information
            </h4>
            <div className="flex items-center gap-4 text-xs">
              <span>
                Attempts:{" "}
                <strong>{event.retry_count}</strong>
              </span>
              {event.last_retry_at && (
                <span>
                  Last retry:{" "}
                  <strong>
                    {formatDistanceToNow(new Date(event.last_retry_at), {
                      addSuffix: true,
                    })}
                  </strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {event.error_message && (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
            <h4 className="text-xs font-medium text-red-500 mb-1">Error</h4>
            <p className="text-xs text-red-400">{event.error_message}</p>
          </div>
        )}

        {/* Payload / Body */}
        <JsonBlock label="Request Body" data={event.body} />

        {/* Headers */}
        <JsonBlock label="Request Headers" data={event.headers} />

        {/* Response */}
        <JsonBlock label="Response" data={event.response} />

        {/* Payload preview fallback */}
        {!event.body && event.payload_preview && (
          <JsonBlock label="Payload Preview" data={event.payload_preview} />
        )}
      </div>
    </Drawer>
  );
}
