"use client";

import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/ThemeProvider";

export function SettingsThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={theme === "light" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("light")}
      >
        <Sun className="mr-2 h-4 w-4" />
        Light
      </Button>
      <Button
        variant={theme === "dark" ? "default" : "outline"}
        size="sm"
        onClick={() => setTheme("dark")}
      >
        <Moon className="mr-2 h-4 w-4" />
        Dark
      </Button>
    </div>
  );
}
