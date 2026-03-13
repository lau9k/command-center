"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import {
  Landmark,
  Loader2,
  Building2,
  CreditCard,
  Unlink,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PlaidAccount {
  id: string;
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
}

interface PlaidItem {
  id: string;
  item_id: string;
  institution_name: string | null;
  status: string;
  updated_at: string;
  accounts: PlaidAccount[];
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getAccountIcon(type: string) {
  switch (type) {
    case "depository":
      return <Building2 className="size-4 text-[#3B82F6]" />;
    case "credit":
      return <CreditCard className="size-4 text-[#8B5CF6]" />;
    default:
      return <Landmark className="size-4 text-muted-foreground" />;
  }
}

function ConnectBankButton({ onSuccess }: { onSuccess: () => void }) {
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
        console.error("Failed to fetch link token");
      }
    }
    fetchLinkToken();
  }, []);

  const handleSuccess = useCallback(
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
        onSuccess();
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
    onSuccess: handleSuccess,
  });

  if (configError) {
    return (
      <p className="text-xs text-muted-foreground">
        Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET in your environment.
      </p>
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

export function PlaidConnect() {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/accounts");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      console.error("Failed to fetch connected accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLastSync = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/sync/status");
      if (!res.ok) return;
      const data = await res.json();
      setLastSync(data.lastSync ?? null);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
    fetchLastSync();
  }, [fetchAccounts, fetchLastSync]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Sync failed");
        return;
      }
      const totalAdded =
        data.synced?.reduce?.(
          (s: number, r: { added: number }) => s + r.added,
          0
        ) ?? data.synced ?? 0;
      toast.success(
        totalAdded > 0
          ? `Synced ${totalAdded} new transaction${totalAdded === 1 ? "" : "s"}`
          : "Accounts are up to date"
      );
      await Promise.all([fetchAccounts(), fetchLastSync()]);
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (itemId: string, institutionName: string | null) => {
    setDisconnecting(itemId);
    try {
      const res = await fetch("/api/plaid/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to disconnect");
        return;
      }
      toast.success(`Disconnected ${institutionName ?? "bank account"}`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Loading bank accounts…
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {items.length} account{items.length === 1 ? "" : "s"} connected
            </span>
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                · Last sync {formatRelativeTime(lastSync)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="ghost"
              size="sm"
            >
              {syncing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              {syncing ? "Syncing…" : "Sync Now"}
            </Button>
          )}
          <ConnectBankButton onSuccess={fetchAccounts} />
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-border bg-background p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-[#3B82F6]" />
                  <span className="text-sm font-medium text-foreground">
                    {item.institution_name ?? "Unknown Institution"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · Updated {formatRelativeTime(item.updated_at)}
                  </span>
                </div>
                <Button
                  onClick={() => handleDisconnect(item.id, item.institution_name)}
                  disabled={disconnecting === item.id}
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground hover:text-destructive"
                >
                  {disconnecting === item.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Unlink className="size-3" />
                  )}
                  Disconnect
                </Button>
              </div>

              {item.accounts.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {item.accounts.map((acct) => (
                    <div
                      key={acct.id}
                      className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-2">
                        {getAccountIcon(acct.type)}
                        <span className="text-foreground">{acct.name}</span>
                        {acct.mask && (
                          <span className="text-xs text-muted-foreground">
                            ····{acct.mask}
                          </span>
                        )}
                      </div>
                      <span className="text-xs capitalize text-muted-foreground">
                        {acct.subtype ?? acct.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No account details available
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
