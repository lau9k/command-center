"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

interface ApiKeyConfig {
  id: string;
  label: string;
  envKey: string;
  value: string;
  isServiceRole: boolean;
  provider: "personize" | "anthropic" | "supabase" | null;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    id: "supabase-url",
    label: "Supabase URL",
    envKey: "NEXT_PUBLIC_SUPABASE_URL",
    value: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    isServiceRole: false,
    provider: null,
  },
  {
    id: "supabase-anon",
    label: "Supabase Anon Key",
    envKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    isServiceRole: false,
    provider: "supabase",
  },
  {
    id: "supabase-service",
    label: "Supabase Service Role Key",
    envKey: "SUPABASE_SERVICE_ROLE_KEY",
    value: "",
    isServiceRole: true,
    provider: null,
  },
];

function maskKey(key: string): string {
  if (!key || key.length <= 8) return "••••••••••••";
  return key.slice(0, 8) + "••••••••" + key.slice(-4);
}

function ValidationIndicator({
  status,
  message,
}: {
  status: ValidationStatus;
  message: string | null;
}) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {status === "validating" && (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Validating...</span>
        </>
      )}
      {status === "valid" && (
        <>
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          <span className="text-xs text-green-500">{message}</span>
        </>
      )}
      {status === "invalid" && (
        <>
          <XCircle className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs text-red-500">{message}</span>
        </>
      )}
    </div>
  );
}

function ApiKeyRow({ apiKey }: { apiKey: ApiKeyConfig }) {
  const [copied, setCopied] = useState(false);
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>("idle");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    if (apiKey.isServiceRole || !apiKey.value) return;
    await navigator.clipboard.writeText(apiKey.value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  const handleValidate = useCallback(async () => {
    if (!apiKey.provider || !apiKey.value) return;

    setValidationStatus("validating");
    setValidationMessage(null);

    try {
      const res = await fetch("/api/settings/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: apiKey.provider, key: apiKey.value }),
      });

      const result = await res.json();
      setValidationStatus(result.valid ? "valid" : "invalid");
      setValidationMessage(result.message ?? null);
    } catch {
      setValidationStatus("invalid");
      setValidationMessage("Validation request failed");
    }
  }, [apiKey]);

  return (
    <div className="flex items-start justify-between py-3">
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
        <ValidationIndicator status={validationStatus} message={validationMessage} />
      </div>
      <div className="flex items-center gap-1 ml-4">
        {apiKey.provider && apiKey.value && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              validationStatus === "valid" && "text-green-500",
              validationStatus === "invalid" && "text-red-500"
            )}
            onClick={handleValidate}
            disabled={validationStatus === "validating"}
          >
            {validationStatus === "validating" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : validationStatus === "valid" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : validationStatus === "invalid" ? (
              <XCircle className="h-3.5 w-3.5" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Validate
          </Button>
        )}
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
        are never exposed to the browser. Click &quot;Validate&quot; to test a
        key against its provider.
      </p>
      <div className="divide-y divide-border">
        {API_KEYS.map((key) => (
          <ApiKeyRow key={key.id} apiKey={key} />
        ))}
      </div>
    </div>
  );
}
