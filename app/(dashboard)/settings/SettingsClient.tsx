"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsProfile } from "./SettingsProfile";
import { SettingsThemeToggle } from "./SettingsThemeToggle";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { PreferencesPanel } from "@/components/settings/PreferencesPanel";
import { DataManagement } from "@/components/settings/DataManagement";
import { APIKeyManager } from "@/components/settings/APIKeyManager";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
import { SyncConfigPanel } from "@/components/settings/SyncConfigPanel";
import { DataSourcesPanel } from "@/components/settings/DataSourcesPanel";
import { IntegrationHealthGrid } from "@/components/settings/IntegrationCard";
import { SeedDemoButton } from "./SeedDemoButton";
import { SettingsDangerZone } from "./SettingsDangerZone";
import {
  User,
  Puzzle,
  Key,
  Bell,
  Database,
  SlidersHorizontal,
  Activity,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PlaidConnect } from "@/components/settings/plaid-connect";
import { GmailConnect } from "@/components/settings/gmail-connect";
import { GranolaSyncButton } from "@/components/settings/GranolaSyncButton";
import { Loader2 } from "lucide-react";

interface SettingsClientProps {
  email: string | null;
  userId: string | null;
}

export function SettingsClient({ email, userId }: SettingsClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, integrations, and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="data-sources" className="gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Data Sources</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Puzzle className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="sync" className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Sync</span>
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Danger Zone</span>
          </TabsTrigger>
          <Link
            href="/settings/governance"
            className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Governance</span>
          </Link>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">
                Manage your display name, email, and timezone
              </p>
            </div>
            <SettingsProfile email={email} userId={userId} />
          </div>
        </TabsContent>

        {/* Preferences Tab — Theme + Defaults */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Theme
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Choose light, dark, or follow your system preference
                  </p>
                </div>
                <SettingsThemeToggle userId={userId} />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Preferences
                </h2>
                <p className="text-sm text-muted-foreground">
                  Customize your dashboard experience
                </p>
              </div>
              <PreferencesPanel userId={userId} />
            </div>
          </div>
        </TabsContent>

        {/* Data Sources Tab */}
        <TabsContent value="data-sources">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Integration Health
                </h2>
                <p className="text-sm text-muted-foreground">
                  Connection status and health of all integrations
                </p>
              </div>
              <IntegrationHealthGrid />
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
                  Gmail
                </h3>
                <Suspense
                  fallback={
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  }
                >
                  <GmailConnect />
                </Suspense>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Granola Meetings
                </h3>
                <GranolaSyncButton />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Integrations
              </h2>
              <p className="text-sm text-muted-foreground">
                Connected services and third-party integrations
              </p>
            </div>
            <IntegrationsPanel />
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                API Keys
              </h2>
              <p className="text-sm text-muted-foreground">
                View and manage API keys used by the application
              </p>
            </div>
            <APIKeyManager />
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Notification Preferences
              </h2>
              <p className="text-sm text-muted-foreground">
                Control how and when you receive notifications
              </p>
            </div>
            <NotificationPrefs />
          </div>
        </TabsContent>

        {/* Sync Configuration Tab */}
        <TabsContent value="sync">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Sync Configuration
              </h2>
              <p className="text-sm text-muted-foreground">
                Manage data source connections, sync schedules, and trigger
                manual syncs
              </p>
            </div>
            <SyncConfigPanel />
          </div>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data">
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Data Management
                </h2>
                <p className="text-sm text-muted-foreground">
                  Export, manage, and control your data
                </p>
              </div>
              <DataManagement />
            </div>

            <div className="rounded-lg border border-border bg-card p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Demo Data
                </h2>
                <p className="text-sm text-muted-foreground">
                  Populate all modules with realistic sample data for demo
                  purposes
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Seed Demo Data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Adds 20 contacts, 15 tasks, 8 content posts, and 10 pipeline
                    deals
                  </p>
                </div>
                <SeedDemoButton />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Danger Zone Tab */}
        <TabsContent value="danger">
          <div className="rounded-lg border border-destructive/50 bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-destructive">
                Danger Zone
              </h2>
              <p className="text-sm text-muted-foreground">
                Irreversible actions
              </p>
            </div>
            <SettingsDangerZone />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
