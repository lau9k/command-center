"use client";

import { Activity, HeartPulse } from "lucide-react";
import { IntegrationHealthGrid } from "@/components/admin/integration-health-grid";
import { CronMonitor } from "@/components/admin/cron-monitor";

export const dynamic = "force-dynamic";

export default function AdminHealthPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HeartPulse className="h-6 w-6" />
          System Health
        </h1>
        <p className="mt-1 text-muted-foreground">
          Monitor integration status, sync jobs, and system health at a glance.
        </p>
      </div>

      {/* Integration Health Grid */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" />
          Integration Status
        </h2>
        <IntegrationHealthGrid />
      </section>

      {/* Cron / Sync Job Monitor */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5" />
          Sync Job Timeline
        </h2>
        <CronMonitor />
      </section>
    </div>
  );
}
