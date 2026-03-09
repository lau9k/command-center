import { SettingsThemeToggle } from "./SettingsThemeToggle";
import { SeedDemoButton } from "./SeedDemoButton";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your preferences
        </p>
      </div>

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
    </div>
  );
}
