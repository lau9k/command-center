"use client";

import { useState, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Brain, Workflow, Loader2 } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
}

const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: "personize",
    name: "Personize",
    description: "AI-powered contact enrichment and personalization",
    icon: <Brain className="h-5 w-5" />,
    connected: true,
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Database, auth, and real-time backend",
    icon: <Database className="h-5 w-5" />,
    connected: true,
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Workflow automation and integrations",
    icon: <Workflow className="h-5 w-5" />,
    connected: false,
  },
];

export function IntegrationsPanel() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(INITIAL_INTEGRATIONS);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (id: string) => {
      setTogglingId(id);
      const integration = integrations.find((i) => i.id === id);
      if (!integration) return;

      const newState = !integration.connected;

      // Optimistic update
      setIntegrations((prev) =>
        prev.map((i) => (i.id === id ? { ...i, connected: newState } : i))
      );

      try {
        // Simulate API call
        await new Promise((r) => setTimeout(r, 800));
        toast.success(
          `${integration.name} ${newState ? "connected" : "disconnected"}`
        );
      } catch {
        // Revert on failure
        setIntegrations((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, connected: !newState } : i
          )
        );
        toast.error(`Failed to update ${integration.name}`);
      } finally {
        setTogglingId(null);
      }
    },
    [integrations]
  );

  return (
    <div className="divide-y divide-border">
      {integrations.map((integration) => (
        <div
          key={integration.id}
          className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
              {integration.icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">
                  {integration.name}
                </p>
                <Badge
                  variant={integration.connected ? "default" : "secondary"}
                  className="text-xs"
                >
                  {integration.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {integration.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {togglingId === integration.id && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              checked={integration.connected}
              onCheckedChange={() => handleToggle(integration.id)}
              disabled={togglingId === integration.id}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
