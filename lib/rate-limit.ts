import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-logger";

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

function getClientIdentifier(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterSeconds = Math.ceil(
      (oldestInWindow + windowMs - now) / 1000
    );
    return { allowed: false, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

type RouteHandler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  prefix: string;
}

export const RATE_LIMITS = {
  ingest: { maxRequests: 100, windowMs: 60_000, prefix: "ingest" },
  crud: { maxRequests: 200, windowMs: 60_000, prefix: "crud" },
  auth: { maxRequests: 10, windowMs: 60_000, prefix: "auth" },
} as const satisfies Record<string, RateLimitConfig>;

export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig
): RouteHandler {
  return async (request, context) => {
    const clientId = getClientIdentifier(request);
    const key = `${config.prefix}:${clientId}`;

    const result = checkRateLimit(key, config.maxRequests, config.windowMs);

    if (!result.allowed) {
      void logActivity({
        action: "created",
        entity_type: "event",
        entity_name: `Rate limit exceeded: ${config.prefix}`,
        source: "webhook",
        metadata: { client_ip: clientId, prefix: config.prefix },
      });

      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfterSeconds) },
        }
      );
    }

    return handler(request, context);
  };
}
