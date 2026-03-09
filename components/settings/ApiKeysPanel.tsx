"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
} from "lucide-react";

interface ApiKey {
  id: string;
  label: string;
  value: string;
  serverOnly: boolean;
}

const DEMO_KEYS: ApiKey[] = [
  {
    id: "supabase-url",
    label: "Supabase URL",
    value: "https://abc123xyz.supabase.co",
    serverOnly: false,
  },
  {
    id: "supabase-anon",
    label: "Supabase Anon Key",
    value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon.abc123",
    serverOnly: false,
  },
  {
    id: "supabase-service",
    label: "Supabase Service Role Key",
    value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service.xyz789",
    serverOnly: true,
  },
  {
    id: "anthropic",
    label: "Anthropic API Key",
    value: "sk-ant-api03-xxxxxxxxxxxxxxxxxxxx",
    serverOnly: true,
  },
];

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

function ApiKeyRow({
  apiKey,
  onRegenerate,
}: {
  apiKey: ApiKey;
  onRegenerate: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleCopy = useCallback(async () => {
    if (apiKey.serverOnly) return;
    await navigator.clipboard.writeText(apiKey.value);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [apiKey]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      onRegenerate(apiKey.id);
      toast.success(`${apiKey.label} regenerated`);
    } catch {
      toast.error("Failed to regenerate key");
    } finally {
      setRegenerating(false);
    }
  }, [apiKey, onRegenerate]);

  return (
    <div className="flex items-center justify-between py-3">
      <div className="space-y-1 min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{apiKey.label}</p>
        <p className="text-xs font-mono text-muted-foreground truncate">
          {apiKey.serverOnly
            ? revealed
              ? apiKey.value
              : "Server-side only"
            : revealed
              ? apiKey.value
              : maskKey(apiKey.value)}
        </p>
      </div>
      <div className="flex items-center gap-1 ml-4">
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

        {!apiKey.serverOnly && (
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
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={regenerating}
            >
              {regenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate {apiKey.label}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will invalidate the current key. Any services using this key
                will need to be updated with the new value.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleRegenerate}>
                Regenerate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKey[]>(DEMO_KEYS);

  const handleRegenerate = useCallback((id: string) => {
    setKeys((prev) =>
      prev.map((k) =>
        k.id === id
          ? {
              ...k,
              value:
                k.value.slice(0, 4) +
                Math.random().toString(36).slice(2, 22) +
                k.value.slice(-4),
            }
          : k
      )
    );
  }, []);

  return (
    <div className="divide-y divide-border">
      {keys.map((key) => (
        <ApiKeyRow key={key.id} apiKey={key} onRegenerate={handleRegenerate} />
      ))}
    </div>
  );
}
