"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Landmark,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataSource {
  id: string;
  name: string;
  status: "connected" | "disconnected" | "error";
  lastSync: string | null;
  recordCount: number;
}

const ONBOARDING_SOURCES = ["gmail", "plaid"] as const;

const ICONS: Record<string, React.ReactNode> = {
  gmail: <Mail className="h-5 w-5" />,
  plaid: <Landmark className="h-5 w-5" />,
};

const STATUS_CONFIG = {
  connected: { label: "Connected", variant: "default" as const },
  disconnected: { label: "Not connected", variant: "secondary" as const },
  error: { label: "Error", variant: "destructive" as const },
};

export function DataSourcesStep() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/data-sources")
      .then((res) => res.json())
      .then((json) => {
        const all: DataSource[] = json.data ?? [];
        setSources(all.filter((s) => ONBOARDING_SOURCES.includes(s.id as typeof ONBOARDING_SOURCES[number])));
      })
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <ExternalLink className="size-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground">
          Connect Data Sources
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Link your accounts to automatically import data. You can always connect more later.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mx-auto max-w-md space-y-4">
          {sources.length === 0 ? (
            <div className="space-y-4">
              {ONBOARDING_SOURCES.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                      {ICONS[id]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{id}</p>
                      <p className="text-xs text-muted-foreground">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {sources.map((source) => {
                const config = STATUS_CONFIG[source.status];
                return (
                  <div
                    key={source.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
                        {ICONS[source.id]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{source.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.status === "connected"
                            ? `${source.recordCount.toLocaleString()} records`
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground">
            More integrations available in Settings &rarr; Data Sources.
          </p>
        </div>
      )}
    </div>
  );
}
