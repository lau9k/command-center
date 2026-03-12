import { DataSourcesPanel } from "@/components/settings/DataSourcesPanel";
import { GranolaSyncButton } from "@/components/settings/GranolaSyncButton";
import { PlaidConnect } from "@/components/settings/plaid-connect";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const revalidate = 3600;

export default function DataSourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-semibold text-foreground">
          Data Sources
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor the health and sync status of your connected data sources
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Source Health
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time status of all data pipelines
          </p>
        </div>
        <DataSourcesPanel />

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Bank Accounts (Plaid)
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Connect bank accounts to automatically sync transactions
          </p>
          <PlaidConnect />
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Granola Meetings
          </h3>
          <GranolaSyncButton />
        </div>
      </div>
    </div>
  );
}
