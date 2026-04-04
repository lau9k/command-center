"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const SHORTCUT_GROUPS = [
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["G", "T"], description: "Go to Tasks" },
      { keys: ["G", "C"], description: "Go to Contacts" },
      { keys: ["G", "P"], description: "Go to Pipeline" },
      { keys: ["G", "F"], description: "Go to Finance" },
      { keys: ["G", "A"], description: "Go to Analytics" },
    ],
  },
  {
    label: "Actions",
    shortcuts: [
      { keys: ["N"], description: "New Task" },
      { keys: ["\u2318", "K"], description: "Command Palette" },
      { keys: ["?"], description: "This dialog" },
    ],
  },
  {
    label: "General",
    shortcuts: [{ keys: ["Esc"], description: "Close dialog / drawer" }],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener("open-keyboard-shortcuts", handleOpen);
    return () =>
      window.removeEventListener("open-keyboard-shortcuts", handleOpen);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => setOpen(true)}
        aria-label="Keyboard shortcuts"
      >
        <Keyboard className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Navigate faster with these shortcuts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h3>
                <ul className="space-y-1.5">
                  {group.shortcuts.map((shortcut) => (
                    <li
                      key={shortcut.description}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{shortcut.description}</span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        {shortcut.keys.map((key, i) => (
                          <Kbd key={i}>{key}</Kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
