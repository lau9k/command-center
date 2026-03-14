import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-error-handler";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntegrationStatus {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  latencyMs: number | null;
  lastChecked: string;
  error: string | null;
}

interface HealthReport {
  overall: "healthy" | "degraded" | "down";
  integrations: IntegrationStatus[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function pingEndpoint(
  url: string,
): Promise<{ ok: boolean; latencyMs: number; error: string | null }> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    }
    return { ok: true, latencyMs, error: null };
  } catch (err) {
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : "Request failed";
    return { ok: false, latencyMs, error: message };
  }
}

function deriveStatus(ok: boolean, latencyMs: number): IntegrationStatus["status"] {
  if (!ok) return "down";
  if (latencyMs > 3000) return "degraded";
  return "healthy";
}

// ---------------------------------------------------------------------------
// GET /api/admin/health/integrations
// ---------------------------------------------------------------------------

export const GET = withErrorHandler(async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date().toISOString();

  // Ping all integration health endpoints in parallel
  const [systemHealth, dataSources, syncLog] = await Promise.all([
    pingEndpoint(`${baseUrl}/api/health`),
    pingEndpoint(`${baseUrl}/api/data-sources`),
    pingEndpoint(`${baseUrl}/api/sync/log?limit=1`),
  ]);

  // Also fetch data sources detail for per-integration status
  let dataSourceDetails: Array<{
    id: string;
    name: string;
    status: string;
    lastSync: string | null;
    recordCount: number;
  }> = [];

  if (dataSources.ok) {
    try {
      const res = await fetch(`${baseUrl}/api/data-sources`, {
        cache: "no-store",
      });
      const json = await res.json();
      dataSourceDetails = json.data ?? [];
    } catch {
      // Fall back to empty
    }
  }

  // Also fetch recent sync log entries for error counting
  let recentSyncErrors = 0;
  try {
    const res = await fetch(
      `${baseUrl}/api/sync/log?status=error&limit=200`,
      { cache: "no-store" },
    );
    const json = await res.json();
    const entries = json.data ?? [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    recentSyncErrors = entries.filter(
      (e: { started_at: string }) =>
        new Date(e.started_at).getTime() > oneDayAgo,
    ).length;
  } catch {
    // Ignore
  }

  // Build per-integration statuses
  const integrations: IntegrationStatus[] = [];

  // Supabase — derived from system health endpoint
  integrations.push({
    id: "supabase",
    name: "Supabase",
    status: deriveStatus(systemHealth.ok, systemHealth.latencyMs),
    latencyMs: systemHealth.latencyMs,
    lastChecked: now,
    error: systemHealth.error,
  });

  // Map data source entries to integration statuses
  for (const ds of dataSourceDetails) {
    const dsStatus: IntegrationStatus["status"] =
      ds.status === "connected"
        ? "healthy"
        : ds.status === "error"
          ? "down"
          : "degraded";

    integrations.push({
      id: ds.id,
      name: ds.name,
      status: dsStatus,
      latencyMs: dataSources.latencyMs,
      lastChecked: now,
      error: ds.status === "error" ? "Integration reported error" : null,
    });
  }

  // If data sources endpoint was unreachable, add fallback entries
  if (dataSourceDetails.length === 0) {
    const fallbackSources = [
      "Gmail",
      "Granola",
      "Plaid",
      "Personize",
      "GitHub",
      "n8n",
    ];
    for (const name of fallbackSources) {
      integrations.push({
        id: name.toLowerCase(),
        name,
        status: dataSources.ok ? "unknown" : "down",
        latencyMs: null,
        lastChecked: now,
        error: dataSources.ok ? null : "Data sources endpoint unreachable",
      });
    }
  }

  // Determine overall status
  const hasDown = integrations.some((i) => i.status === "down");
  const hasDegraded = integrations.some((i) => i.status === "degraded");
  const overall: HealthReport["overall"] = hasDown
    ? "down"
    : hasDegraded
      ? "degraded"
      : "healthy";

  const report: HealthReport = {
    overall,
    integrations,
    timestamp: now,
  };

  return NextResponse.json({
    ...report,
    syncErrors24h: recentSyncErrors,
  });
});
