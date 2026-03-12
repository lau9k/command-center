"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GmailAccount {
  id: string;
  email_address: string;
  status: "active" | "inactive";
  history_id: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(dateStr: string): string {
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

export function GmailConnect() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/gmail/accounts");
      const json = await res.json();
      const active = (json.data as GmailAccount[] | undefined)?.filter(
        (a) => a.status === "active"
      );
      setAccounts(active ?? []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // Handle OAuth redirect query params
  useEffect(() => {
    const gmailParam = searchParams.get("gmail");
    if (gmailParam === "connected") {
      setFlash({
        type: "success",
        message: "Gmail account connected successfully",
      });
      fetchAccounts();
    } else if (gmailParam === "error") {
      const message = searchParams.get("message") ?? "Failed to connect Gmail";
      setFlash({ type: "error", message });
    }
  }, [searchParams]);

  const handleDisconnect = async (accountId: string) => {
    setDisconnecting(accountId);
    try {
      const res = await fetch("/api/gmail/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_id: accountId }),
      });

      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
        setFlash({ type: "success", message: "Gmail account disconnected" });
      }
    } catch {
      setFlash({ type: "error", message: "Failed to disconnect account" });
    } finally {
      setDisconnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {flash && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
            flash.type === "success"
              ? "bg-green-500/10 text-green-700 dark:text-green-400"
              : "bg-red-500/10 text-red-700 dark:text-red-400"
          }`}
        >
          {flash.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {flash.message}
        </div>
      )}

      {accounts.length > 0 ? (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {account.email_address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last sync: {formatDate(account.updated_at)}
                  </p>
                </div>
                <Badge variant="default" className="text-xs">
                  Connected
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisconnect(account.id)}
                disabled={disconnecting === account.id}
                className="text-muted-foreground hover:text-destructive"
              >
                {disconnecting === account.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <Button variant="outline" size="sm" className="gap-2" asChild>
        <a href="/api/gmail/auth">
          <Mail className="h-4 w-4" />
          {accounts.length > 0 ? "Connect Another Gmail" : "Connect Gmail"}
        </a>
      </Button>
    </div>
  );
}
