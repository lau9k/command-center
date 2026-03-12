"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsProfile } from "./SettingsProfile";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { PreferencesPanel } from "@/components/settings/PreferencesPanel";
import { DataManagement } from "@/components/settings/DataManagement";
import { ApiKeysPanel } from "@/components/settings/ApiKeysPanel";
import { NotificationPrefs } from "@/components/settings/NotificationPrefs";
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
} from "lucide-react";
import Link from "next/link";

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
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Puzzle className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <Link
            href="/settings/data-sources"
            className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Activity className="h-4 w-4" />
            Data Sources
          </Link>
        </TabsList>

        {/* Profile Tab — read-only */}
        <TabsContent value="profile">
          <div className="rounded-lg border border-border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Profile</h2>
              <p className="text-sm text-muted-foreground">
                Your account information
              </p>
            </div>
            <SettingsProfile email={email} userId={userId} />
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

        {/* Preferences Tab */}
        <TabsContent value="preferences">
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
            <ApiKeysPanel />
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

            {/* Demo Data */}
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

            {/* Danger Zone */}
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
