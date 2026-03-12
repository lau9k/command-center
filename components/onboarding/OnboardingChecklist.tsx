"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  ChevronUp,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
}

interface OnboardingData {
  steps: OnboardingStep[];
  completedCount: number;
  totalSteps: number;
  dismissed: boolean;
}

export function OnboardingChecklist() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((json: OnboardingData) => {
        if (json.dismissed) {
          setDismissed(true);
        }
        setData(json);
      })
      .catch(() => {
        // Silently fail — don't block the dashboard
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    try {
      await fetch("/api/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
    } catch {
      // Best-effort dismiss
    }
  }, []);

  if (loading || dismissed || !data || data.completedCount === data.totalSteps) {
    return null;
  }

  const progress = Math.round((data.completedCount / data.totalSteps) * 100);

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-5 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Getting Started
          </h2>
          <span className="text-xs text-muted-foreground">
            {data.completedCount}/{data.totalSteps} complete
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Dismiss checklist"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {!collapsed && (
        <div className="border-t border-border">
          {data.steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-start gap-3 border-b border-border/50 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/50"
            >
              {step.completed ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.completed ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* All done CTA */}
      {data.completedCount > 0 && data.completedCount < data.totalSteps && !collapsed && (
        <div className="border-t border-border px-4 py-3">
          <Button variant="ghost" size="sm" onClick={handleDismiss} className="w-full text-xs">
            Dismiss checklist
          </Button>
        </div>
      )}
    </div>
  );
}
