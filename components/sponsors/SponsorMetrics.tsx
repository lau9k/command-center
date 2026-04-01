"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Calendar, Send, Activity } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import type { SponsorMetricsResponse } from "@/app/api/sponsors/[id]/metrics/route";
import { colors } from "@/lib/design-tokens";

interface SponsorMetricsProps {
  sponsorId: string;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "USD" ? "$" : currency;
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  return `${symbol}${amount.toLocaleString()}`;
}

export function SponsorMetrics({ sponsorId }: SponsorMetricsProps) {
  const [metrics, setMetrics] = useState<SponsorMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sponsors/${sponsorId}/metrics`);
      if (!res.ok) return;
      const json = await res.json();
      setMetrics(json.data);
    } finally {
      setLoading(false);
    }
  }, [sponsorId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No metrics data available for this sponsor.
      </div>
    );
  }

  const outreachLabel =
    metrics.outreach_stats.total === 0
      ? "No outreach"
      : `${metrics.outreach_stats.replied} replied / ${metrics.outreach_stats.total} total`;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Total Contribution"
        value={formatCurrency(metrics.total_amount, metrics.currency)}
        icon={<DollarSign className="size-4" />}
        accentColor={colors.accent.green}
      />
      <KpiCard
        label="Events Sponsored"
        value={metrics.event_count}
        icon={<Calendar className="size-4" />}
        accentColor={colors.accent.blue}
      />
      <KpiCard
        label="Outreach Status"
        value={outreachLabel}
        icon={<Send className="size-4" />}
        subtitle={
          metrics.outreach_stats.follow_up_needed > 0
            ? `${metrics.outreach_stats.follow_up_needed} need follow-up`
            : undefined
        }
        accentColor={colors.accent.purple}
      />
      <KpiCard
        label="Engagement Score"
        value={`${metrics.engagement_score}/100`}
        icon={<Activity className="size-4" />}
        accentColor={
          metrics.engagement_score >= 60
            ? colors.accent.green
            : metrics.engagement_score >= 30
              ? colors.accent.yellow
              : colors.accent.red
        }
      />
    </div>
  );
}
