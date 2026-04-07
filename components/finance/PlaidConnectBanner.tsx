"use client";

import { AlertTriangle, Landmark } from "lucide-react";
import { PlaidLinkButton } from "./PlaidLinkButton";

interface PlaidConnectBannerProps {
  status: "not_configured" | "configured_not_linked";
}

export function PlaidConnectBanner({ status }: PlaidConnectBannerProps) {
  if (status === "not_configured") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-950/40">
        <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Plaid integration not configured
          </p>
          <p className="text-xs text-muted-foreground">
            Set <code className="rounded bg-muted px-1 font-mono">PLAID_CLIENT_ID</code> and{" "}
            <code className="rounded bg-muted px-1 font-mono">PLAID_SECRET</code> in your
            environment variables to enable bank account syncing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-950/40">
      <div className="flex items-center gap-3">
        <Landmark className="size-5 text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Link your bank account to start syncing
          </p>
          <p className="text-xs text-muted-foreground">
            Plaid is configured and ready. Connect a bank account to automatically sync
            transactions and track balances.
          </p>
        </div>
      </div>
      <PlaidLinkButton onSuccess={() => window.location.reload()} />
    </div>
  );
}
