"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  Users,
  ListTodo,
  DollarSign,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const FEATURES = [
  { icon: Users, label: "Contacts", description: "Manage your network" },
  { icon: ListTodo, label: "Tasks", description: "Track your work" },
  { icon: DollarSign, label: "Pipeline", description: "Monitor deals" },
  { icon: MessageSquare, label: "Conversations", description: "Log interactions" },
  { icon: Calendar, label: "Meetings", description: "Sync meeting notes" },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((json) => {
        if (!json.welcomeSeen && json.completedCount === 0) {
          setOpen(true);
        }
      })
      .catch(() => {
        // Silently fail
      });
  }, []);

  const handleClose = useCallback(async () => {
    setOpen(false);
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "welcome_seen" }),
      });
    } catch {
      // Best-effort
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Rocket className="size-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">
            Welcome to Command Center
          </DialogTitle>
          <DialogDescription className="text-center">
            Your all-in-one dashboard for managing contacts, tasks, deals, and
            more. Here&apos;s what you can do:
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-4">
          {FEATURES.map((feature) => (
            <div key={feature.label} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <feature.icon className="size-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={handleClose} className="w-full">
          Get Started
        </Button>
      </DialogContent>
    </Dialog>
  );
}
