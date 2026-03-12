"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Copy, Check, Shield } from "lucide-react";

interface ApiKeyConfig {
  id: string;
  label: string;
  envKey: string;
  value: string;
  isServiceRole: boolean;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    id: "supabase-url",
    label: "Supabase URL",
    envKey: "NEXT_PUBLIC_SUPABASE_URL",
    value: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    isServiceRole: false,
  },
  {
    id: "supabase-anon",
    label: "Supabase Anon Key",
    envKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    isServiceRole: false,
  },
  {
    id: "supabase-service",
    label: "Supabase Service Role Key",
    envKey: "SUPABASE_SERVICE_ROLE_KEY",
    value: "",
    isServiceRole: true,
  },
];

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "••••••••••••";
  return key.slice(0, 8) + "••••••••" + key.slice(-4);
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKeyConfig }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (apiKey.isServiceRole || !apiKey.value) return;
    await navigator.clipboard.writeText(apiKey.value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{apiKey.label}</p>
          {apiKey.isServiceRole && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
              <Shield className="h-3 w-3" />
              Server Only
            </span>
          )}
        </div>
        <p className="text-xs font-mono text-muted-foreground truncate">
          {apiKey.isServiceRole
            ? "Hidden — server-side only, never exposed to client"
            : maskKey(apiKey.value)}
        </p>
      </div>
      <div className="flex items-center gap-1 ml-4">
        {!apiKey.isServiceRole && apiKey.value && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

export function APIKeyManager() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These keys are configured via environment variables. Service role keys
        are never exposed to the browser.
      </p>
      <div className="divide-y divide-border">
        {API_KEYS.map((key) => (
          <ApiKeyRow key={key.id} apiKey={key} />
        ))}
      </div>
    </div>
  );
}
