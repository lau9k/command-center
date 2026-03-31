"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Landmark,
  RefreshCw,
  Loader2,
  Unlink,
  CreditCard,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PlaidLinkButton } from "./PlaidLinkButton";

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

function formatLastSync(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
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

export function ConnectedAccounts() {
  const [items, setItems] = useState<PlaidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/plaid/accounts");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // Failed to fetch connected accounts — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Sync failed");
        return;
      }
      const data = await res.json();
      const totalAdded = data.synced?.reduce(
        (s: number, r: { added: number }) => s + r.added,
        0
      ) ?? 0;
      toast.success(
        totalAdded > 0
          ? `Synced ${totalAdded} new transaction${totalAdded === 1 ? "" : "s"}`
          : "Accounts are up to date"
      );
      await fetchAccounts();
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

  const handleLinkSuccess = () => {
    fetchAccounts();
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading connected accounts…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Connected Accounts
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="ghost"
              size="xs"
            >
              {syncing ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}
              {syncing ? "Syncing…" : "Sync Now"}
            </Button>
          )}
          <PlaidLinkButton onSuccess={handleLinkSuccess} />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No bank accounts connected yet. Click &ldquo;Connect Bank Account&rdquo; to get started.
        </p>
      ) : (
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
                    · Last synced {formatLastSync(item.updated_at)}
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
                        <span className="text-foreground">
                          {acct.name}
                        </span>
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
