"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

export type Theme = "dark" | "light" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "dark" | "light";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "command-center-theme";

let currentTheme: Theme = "dark";
let resolvedTheme: "dark" | "light" = "dark";
const listeners = new Set<() => void>();

function resolveTheme(t: Theme): "dark" | "light" {
  if (t === "system") {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
    return "dark";
  }
  return t;
}

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "dark";
}

function getResolvedSnapshot(): "dark" | "light" {
  return resolvedTheme;
}

function getResolvedServerSnapshot(): "dark" | "light" {
  return "dark";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function applyTheme(t: Theme) {
  currentTheme = t;
  resolvedTheme = resolveTheme(t);
  document.documentElement.setAttribute("data-theme", resolvedTheme);
  localStorage.setItem(STORAGE_KEY, t);
  listeners.forEach((cb) => cb());
}

// Initialize from localStorage / prefers-color-scheme on first client load
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    currentTheme = stored;
  } else {
    currentTheme = "system";
  }
  resolvedTheme = resolveTheme(currentTheme);

  // Listen for system theme changes when in "system" mode
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (currentTheme === "system") {
        resolvedTheme = resolveTheme("system");
        document.documentElement.setAttribute("data-theme", resolvedTheme);
        listeners.forEach((cb) => cb());
      }
    });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const resolved = useSyncExternalStore(
    subscribe,
    getResolvedSnapshot,
    getResolvedServerSnapshot
  );

  const setTheme = useCallback((t: Theme) => applyTheme(t), []);
  const toggleTheme = useCallback(() => {
    const next = currentTheme === "dark" ? "light" : currentTheme === "light" ? "system" : "dark";
    applyTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme: resolved, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
