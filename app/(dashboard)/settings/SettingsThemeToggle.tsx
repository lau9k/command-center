"use client";

import { useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/components/theme/ThemeProvider";
import { toast } from "sonner";

interface SettingsThemeToggleProps {
  userId: string | null;
}

const options: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function SettingsThemeToggle({ userId }: SettingsThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const handleSetTheme = useCallback(
    async (newTheme: Theme) => {
      setTheme(newTheme);

      if (!userId) return;

      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, theme: newTheme }),
        });

        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error || "Failed to save theme");
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to persist theme"
        );
      }
    },
    [userId, setTheme]
  );

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      {options.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={theme === value ? "default" : "ghost"}
          size="sm"
          onClick={() => handleSetTheme(value)}
          className="gap-1.5"
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
