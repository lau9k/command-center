"use client";

import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    async function fetchLinkToken() {
      try {
        const res = await fetch("/api/plaid/link-token", { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
          if (res.status === 500 && data.error?.includes("Missing PLAID")) {
            setConfigError(true);
          }
          return;
        }

        setLinkToken(data.link_token);
      } catch {
        // Failed to fetch link token — button will remain disabled
      }
    }

    fetchLinkToken();
  }, []);

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: { institution?: { name?: string } | null }) => {
      setLoading(true);
      try {
        const res = await fetch("/api/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_name: metadata.institution?.name ?? null,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error ?? "Failed to connect bank account");
          return;
        }

        toast.success("Bank account connected!");
        onSuccess?.();
      } catch {
        toast.error("Failed to connect bank account");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
  });

  if (configError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Landmark className="size-4 shrink-0" />
        Bank connection requires Plaid setup. Contact admin.
      </div>
    );
  }

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Landmark className="size-4" />
      )}
      {loading ? "Connecting…" : "Connect Bank Account"}
    </Button>
  );
}
