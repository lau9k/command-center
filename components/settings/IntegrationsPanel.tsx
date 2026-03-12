"use client";

import { Badge } from "@/components/ui/badge";
import { Database, Brain, Calendar, Github } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  detail: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "supabase",
    name: "Supabase",
    description: "Database, auth, and real-time backend",
    icon: <Database className="h-5 w-5" />,
    connected: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    detail: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : "Not configured",
  },
  {
    id: "personize",
    name: "Personize",
    description: "AI-powered contact enrichment and personalization",
    icon: <Brain className="h-5 w-5" />,
    connected: true,
    detail: "API connected",
  },
  {
    id: "granola",
    name: "Granola",
    description: "Meeting notes and transcription",
    icon: <Calendar className="h-5 w-5" />,
    connected: false,
    detail: "Not configured",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Repository management and CI/CD",
    icon: <Github className="h-5 w-5" />,
    connected: false,
    detail: "Not configured",
  },
];

export function IntegrationsPanel() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {INTEGRATIONS.map((integration) => (
        <div
          key={integration.id}
          className="flex items-start gap-3 rounded-lg border border-border p-4"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            {integration.icon}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
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
            <p className="text-xs font-mono text-muted-foreground">
              {integration.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
