"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "command-center-theme";

let currentTheme: Theme = "dark";
const listeners = new Set<() => void>();

function getSnapshot(): Theme {
  return currentTheme;
}

function getServerSnapshot(): Theme {
  return "dark";
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function applyTheme(t: Theme) {
  currentTheme = t;
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(STORAGE_KEY, t);
  listeners.forEach((cb) => cb());
}

// Initialize from localStorage / prefers-color-scheme on first client load
if (typeof window !== "undefined") {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    currentTheme = stored;
  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    currentTheme = "light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((t: Theme) => applyTheme(t), []);
  const toggleTheme = useCallback(
    () => applyTheme(currentTheme === "dark" ? "light" : "dark"),
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
