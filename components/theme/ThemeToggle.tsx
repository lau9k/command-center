"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;
  const label =
    theme === "system"
      ? "System theme"
      : `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`;

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={label}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}
