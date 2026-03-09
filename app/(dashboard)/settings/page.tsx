import { createClient } from "@/lib/supabase/server";
import { SettingsThemeToggle } from "./SettingsThemeToggle";
import { SeedDemoButton } from "./SeedDemoButton";
import { SettingsProfile } from "./SettingsProfile";
import { SettingsApiKeys } from "./SettingsApiKeys";
import { SettingsDangerZone } from "./SettingsDangerZone";

export default async function SettingsPage() {
  let userEmail: string | null = null;
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
    userId = user?.id ?? null;
  } catch {
    // Supabase not configured
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground">
            Your account information
          </p>
        </div>
        <SettingsProfile email={userEmail} userId={userId} />
      </div>

      {/* Appearance */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Customize how the dashboard looks
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Theme</p>
            <p className="text-sm text-muted-foreground">
              Switch between dark and light mode
            </p>
          </div>
          <SettingsThemeToggle />
        </div>
      </div>

      {/* API Keys */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Keys used by the application
          </p>
        </div>
        <SettingsApiKeys />
      </div>

      {/* Demo Data */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Demo Data</h2>
          <p className="text-sm text-muted-foreground">
            Populate all modules with realistic sample data for demo purposes
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Seed Demo Data</p>
            <p className="text-sm text-muted-foreground">
              Adds 20 contacts, 15 tasks, 8 content posts, and 10 pipeline deals
            </p>
          </div>
          <SeedDemoButton />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 bg-card p-4 space-y-6">
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
  );
}
