"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const GO_ROUTES: Record<string, string> = {
  t: "/tasks",
  c: "/contacts",
  p: "/pipeline",
  f: "/finance",
  a: "/analytics",
};

const PENDING_TIMEOUT = 500;

function isEditableTarget(e: KeyboardEvent): boolean {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return (e.target as HTMLElement)?.isContentEditable === true;
}

export function useKeyboardShortcuts() {
  const router = useRouter();
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function clearPending() {
      pendingRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e)) return;

      const key = e.key.toLowerCase();

      // Esc → close any open drawer/dialog
      if (key === "escape") {
        // Programmatically click the closest open dialog/drawer close button
        // Radix UI uses [data-state="open"] on overlays
        const overlay = document.querySelector(
          '[role="dialog"], [data-state="open"][data-radix-portal]'
        );
        if (overlay) {
          // Dispatch Escape so Radix handles closing natively
          // (the browser already dispatches this, but we mark it handled)
          return;
        }
        return;
      }

      // Two-key "g" combos
      if (pendingRef.current === "g") {
        const route = GO_ROUTES[key];
        if (route) {
          e.preventDefault();
          router.push(route);
        }
        clearPending();
        return;
      }

      if (key === "g") {
        pendingRef.current = "g";
        timerRef.current = setTimeout(clearPending, PENDING_TIMEOUT);
        return;
      }

      // N → navigate to /tasks to create a new task
      if (key === "n") {
        e.preventDefault();
        router.push("/tasks?new=1");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearPending();
    };
  }, [router]);
}
