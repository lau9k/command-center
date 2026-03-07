import { SettingsThemeToggle } from "./SettingsThemeToggle";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your preferences
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
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
    </div>
  );
}
