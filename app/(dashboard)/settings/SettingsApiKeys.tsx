"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiKeyRowProps {
  label: string;
  envVar: string;
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function ApiKeyRow({ label, envVar }: ApiKeyRowProps) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  // Client-side env vars prefixed with NEXT_PUBLIC_ are available
  const isPublic = envVar.startsWith("NEXT_PUBLIC_");
  const value = isPublic
    ? (typeof window !== "undefined"
        ? process.env[envVar]
        : undefined) ?? "Not configured"
    : "Server-side only";
  const isConfigured = value !== "Not configured" && value !== "Server-side only";

  async function handleCopy() {
    if (!isConfigured) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs font-mono text-muted-foreground truncate">
          {!isConfigured
            ? value
            : revealed
              ? value
              : maskKey(value)}
        </p>
      </div>
      <div className="flex items-center gap-1 ml-4">
        {isConfigured && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setRevealed(!revealed)}
            >
              {revealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function SettingsApiKeys() {
  return (
    <div className="divide-y divide-border">
      <ApiKeyRow label="Supabase URL" envVar="NEXT_PUBLIC_SUPABASE_URL" />
      <ApiKeyRow
        label="Supabase Anon Key"
        envVar="NEXT_PUBLIC_SUPABASE_ANON_KEY"
      />
      <ApiKeyRow
        label="Supabase Service Role Key"
        envVar="SUPABASE_SERVICE_ROLE_KEY"
      />
      <ApiKeyRow label="Anthropic API Key" envVar="ANTHROPIC_API_KEY" />
    </div>
  );
}
