"use client";

import { Landmark } from "lucide-react";
import { PlaidLinkButton } from "./PlaidLinkButton";

export function PlaidConnectBanner() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-5 py-4 dark:border-blue-900 dark:bg-blue-950/40">
      <div className="flex items-center gap-3">
        <Landmark className="size-5 text-blue-600 dark:text-blue-400" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Connect your bank account
          </p>
          <p className="text-xs text-muted-foreground">
            Link a bank account to automatically sync transactions and track balances.
          </p>
        </div>
      </div>
      <PlaidLinkButton onSuccess={() => window.location.reload()} />
    </div>
  );
}
