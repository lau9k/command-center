"use client";

import { useState, useCallback } from "react";
import { Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WebhookPayloadViewer } from "./WebhookPayloadViewer";

const EVENT_TYPES = [
  "invoice.paid",
  "payment.received",
  "subscription.created",
  "push",
  "pull_request",
  "message",
  "custom",
] as const;

const DEFAULT_PAYLOAD = JSON.stringify(
  {
    event: "test",
    timestamp: new Date().toISOString(),
    data: {
      id: "test_123",
      message: "This is a test webhook payload",
    },
  },
  null,
  2
);

interface TestResult {
  status_code: number;
  headers: Record<string, string>;
  body: Record<string, unknown> | string | null;
  duration_ms: number;
  error_message: string | null;
}

interface WebhookTesterProps {
  onTestSent?: () => void;
}

export function WebhookTester({ onTestSent }: WebhookTesterProps) {
  const [endpointUrl, setEndpointUrl] = useState("");
  const [eventType, setEventType] = useState<string>(EVENT_TYPES[0]);
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validatePayload = useCallback((raw: string): boolean => {
    try {
      JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleSend = useCallback(async () => {
    setError(null);
    setResult(null);

    if (!endpointUrl.trim()) {
      setError("Endpoint URL is required");
      return;
    }

    try {
      new URL(endpointUrl);
    } catch {
      setError("Invalid URL format");
      return;
    }

    if (!validatePayload(payload)) {
      setError("Invalid JSON payload");
      return;
    }

    setSending(true);

    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: endpointUrl,
          event_type: eventType,
          payload: JSON.parse(payload) as Record<string, unknown>,
        }),
      });

      if (res.status === 429) {
        setError("Rate limit exceeded. Please wait before sending another test.");
        return;
      }

      const json = (await res.json()) as { data?: TestResult; error?: string };

      if (json.error) {
        setError(json.error);
        return;
      }

      if (json.data) {
        setResult(json.data);
        onTestSent?.();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send test webhook"
      );
    } finally {
      setSending(false);
    }
  }, [endpointUrl, eventType, payload, validatePayload, onTestSent]);

  const isSuccess = result && result.status_code >= 200 && result.status_code < 300;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Endpoint URL */}
        <div className="sm:col-span-2">
          <label
            htmlFor="webhook-url"
            className="block text-sm font-medium mb-1.5"
          >
            Endpoint URL
          </label>
          <input
            id="webhook-url"
            type="url"
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            placeholder="https://example.com/api/webhook"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Event Type */}
        <div>
          <label
            htmlFor="event-type"
            className="block text-sm font-medium mb-1.5"
          >
            Event Type
          </label>
          <select
            id="event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Send Button */}
        <div className="flex items-end">
          <Button
            onClick={() => void handleSend()}
            disabled={sending || !endpointUrl.trim()}
            className="gap-1.5"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sending ? "Sending..." : "Send Test"}
          </Button>
        </div>
      </div>

      {/* Payload Editor */}
      <div>
        <label
          htmlFor="payload-editor"
          className="block text-sm font-medium mb-1.5"
        >
          JSON Payload
        </label>
        <textarea
          id="payload-editor"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={10}
          spellCheck={false}
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            !validatePayload(payload) && payload.trim()
              ? "border-red-500 focus:ring-red-500"
              : ""
          )}
        />
        {!validatePayload(payload) && payload.trim() && (
          <p className="mt-1 text-xs text-red-500">Invalid JSON</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : result.status_code === 0 ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  isSuccess
                    ? "border-green-500/30 text-green-500"
                    : result.status_code === 0
                      ? "border-yellow-500/30 text-yellow-500"
                      : "border-red-500/30 text-red-500"
                )}
              >
                {result.status_code === 0 ? "No Response" : result.status_code}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {result.duration_ms}ms
              </span>
            </div>
          </div>

          {result.error_message && (
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs text-red-400">{result.error_message}</p>
            </div>
          )}

          {result.body != null ? (
            <WebhookPayloadViewer
              data={result.body}
              label="Response Body"
            />
          ) : null}

          {Object.keys(result.headers).length > 0 && (
            <WebhookPayloadViewer
              data={result.headers}
              label="Response Headers"
              defaultExpanded={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
