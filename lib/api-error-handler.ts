import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

/**
 * Wraps an API route handler with centralized error handling.
 * Catches unhandled exceptions, reports to Sentry with safe request context
 * (method, path, query params — no body or PII), and returns a structured
 * { error: string } response.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const method = request.method;
      const url = new URL(request.url);
      const path = url.pathname;
      const queryParams = Object.fromEntries(url.searchParams.entries());

      Sentry.captureException(error, {
        tags: {
          "api.method": method,
          "api.path": path,
        },
        extra: {
          queryParams,
        },
      });

      const message =
        error instanceof Error ? error.message : "Internal server error";

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
