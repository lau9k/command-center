import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Edge Middleware — lightweight, pre-cold-start auth gate.
 *
 * API routes are rejected early when obvious auth signals are missing.
 * The real validation still happens inside each route handler (withAuth,
 * verifyCronAuth, validateWebhookSecret, etc.).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── API routes: fast header / cookie checks ──────────────────────────
  if (pathname.startsWith("/api/")) {
    // Ingest cron/admin endpoints — require API_SECRET via Bearer or x-cron-key
    if (
      pathname === "/api/ingest/process" ||
      pathname === "/api/ingest/replay"
    ) {
      const secret = process.env.API_SECRET;
      if (!secret) return NextResponse.next();
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.replace("Bearer ", "");
      const cronKey = request.headers.get("x-cron-key");
      if (bearerToken !== secret && cronKey !== secret) {
        return unauthorized("Invalid API secret");
      }
      return NextResponse.next();
    }

    // Ingest health — public (n8n health-check workflows need unauthenticated access)
    if (pathname.startsWith("/api/ingest/health")) {
      return NextResponse.next();
    }

    // Ingest webhooks — require shared secret
    if (pathname.startsWith("/api/ingest/")) {
      const secret = process.env.WEBHOOK_SECRET;
      if (!secret || request.headers.get("x-webhook-secret") !== secret) {
        return unauthorized("Missing or invalid webhook secret");
      }
      return NextResponse.next();
    }

    // Admin routes — require SEED_SECRET via header or query param
    if (pathname.startsWith("/api/admin/")) {
      const secret = process.env.SEED_SECRET;
      if (!secret) return NextResponse.next(); // let route-level handler return 500
      const provided =
        request.headers.get("x-seed-secret") ??
        request.nextUrl.searchParams.get("secret");
      if (provided !== secret) {
        return unauthorized("Invalid admin secret");
      }
      return NextResponse.next();
    }

    // Cron-triggered sync routes — require CRON_SECRET
    if (
      pathname.startsWith("/api/gmail/sync") ||
      pathname.startsWith("/api/plaid/sync")
    ) {
      const secret = process.env.CRON_SECRET;
      if (!secret) return NextResponse.next();
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.replace("Bearer ", "");
      const cronKey = request.headers.get("x-cron-key");
      if (bearerToken !== secret && cronKey !== secret) {
        return unauthorized("Invalid cron secret");
      }
      return NextResponse.next();
    }

    // OAuth callback — Google redirects here without session cookies
    if (pathname.startsWith("/api/gmail/callback")) {
      return NextResponse.next();
    }

    // All other API routes — require a Supabase auth cookie
    const hasAuthCookie = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
    if (!hasAuthCookie) {
      return unauthorized();
    }

    return NextResponse.next();
  }

  // ── Dashboard / page routes: full session refresh ────────────────────
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
