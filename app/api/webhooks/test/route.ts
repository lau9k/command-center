import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";
import { withRateLimit } from "@/lib/rate-limit";
import { logWebhookEvent } from "@/lib/webhook-logger";

interface TestWebhookBody {
  url: string;
  event_type: string;
  payload: Record<string, unknown>;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const handler = withErrorHandler(async (request: NextRequest) => {
  const body = (await request.json()) as Partial<TestWebhookBody>;

  if (!body.url || typeof body.url !== "string" || !isValidUrl(body.url)) {
    return NextResponse.json(
      { error: "Invalid or missing 'url' field" },
      { status: 400 }
    );
  }

  if (!body.event_type || typeof body.event_type !== "string") {
    return NextResponse.json(
      { error: "Invalid or missing 'event_type' field" },
      { status: 400 }
    );
  }

  if (!body.payload || typeof body.payload !== "object") {
    return NextResponse.json(
      { error: "Invalid or missing 'payload' field" },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  let statusCode: number;
  let responseBody: string;
  const responseHeaders: Record<string, string> = {};
  let errorMessage: string | null = null;

  try {
    const res = await fetch(body.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": body.event_type,
        "X-Webhook-Test": "true",
      },
      body: JSON.stringify(body.payload),
    });

    statusCode = res.status;
    responseBody = await res.text();
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
  } catch (err) {
    statusCode = 0;
    responseBody = "";
    errorMessage =
      err instanceof Error ? err.message : "Failed to reach endpoint";
  }

  const durationMs = Date.now() - startTime;

  void logWebhookEvent({
    source: "test",
    endpoint: body.url,
    method: "POST",
    status_code: statusCode,
    payload_preview: JSON.stringify(body.payload).slice(0, 500),
    duration_ms: durationMs,
    error_message: errorMessage ?? undefined,
  });

  let parsedResponse: Record<string, unknown> | string = responseBody;
  try {
    parsedResponse = JSON.parse(responseBody) as Record<string, unknown>;
  } catch {
    // keep as string
  }

  return NextResponse.json({
    data: {
      status_code: statusCode,
      headers: responseHeaders,
      body: parsedResponse,
      duration_ms: durationMs,
      error_message: errorMessage,
    },
  });
});

export const POST = withRateLimit(handler, {
  maxRequests: 10,
  windowMs: 60_000,
  prefix: "webhook-test",
});
