import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let hasServiceKey = false;
  try { createServiceClient(); hasServiceKey = true; } catch { /* missing */ }

  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: hasUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey,
    supabase_service_key: hasServiceKey,
  };

  const allSet = hasUrl && hasAnonKey && hasServiceKey;

  if (!allSet) {
    return NextResponse.json({
      status: "error",
      message: "Missing required environment variables",
      env: envVars,
      supabase: "not_connected",
      personize: "not_checked",
      sentry: "not_checked",
      environment: process.env.VERCEL_ENV ?? "development",
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
      deployed_at: process.env.VERCEL_GIT_COMMIT_DATE ?? "unknown",
    }, { status: 503 });
  }

  // Check Supabase connectivity
  let supabaseStatus: "connected" | "error" = "error";
  let supabaseMessage: string | undefined;
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("transactions").select("id").limit(1);
    if (error) {
      supabaseMessage = `Supabase query failed: ${error.message}`;
    } else {
      supabaseStatus = "connected";
    }
  } catch (err) {
    supabaseMessage = err instanceof Error ? err.message : "Unknown error";
  }

  // Check Personize API reachability
  const personizeKey = process.env.PERSONIZE_API_KEY;
  let personizeStatus: "reachable" | "unreachable" | "not_configured" = "not_configured";
  if (personizeKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch("https://api.personize.com/health", {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      personizeStatus = res.ok ? "reachable" : "unreachable";
    } catch {
      personizeStatus = "unreachable";
    }
  }

  // Check Sentry status
  const sentryStatus = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    ? "configured"
    : "not_configured";

  const isHealthy = supabaseStatus === "connected";

  return NextResponse.json({
    status: isHealthy ? "ok" : "error",
    ...(supabaseMessage ? { message: supabaseMessage } : {}),
    env: envVars,
    supabase: supabaseStatus,
    personize: personizeStatus,
    sentry: sentryStatus,
    environment: process.env.VERCEL_ENV ?? "development",
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    deployed_at: process.env.VERCEL_GIT_COMMIT_DATE ?? "unknown",
  }, { status: isHealthy ? 200 : 503 });
}
