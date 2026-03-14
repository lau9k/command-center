"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ApiKeysStep } from "./steps/ApiKeysStep";
import { DataSourcesStep } from "./steps/DataSourcesStep";
import { FirstProjectStep } from "./steps/FirstProjectStep";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "api-keys", label: "API Keys" },
  { id: "data-sources", label: "Data Sources" },
  { id: "first-project", label: "First Project" },
] as const;

interface OnboardingWizardProps {
  onComplete: () => Promise<void>;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  // Welcome step state
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");

  // First project step state
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const finishSetup = useCallback(async () => {
    setCompleting(true);
    try {
      // Create project if name was provided
      if (projectName.trim()) {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_project",
            projectName: projectName.trim(),
            projectDescription: projectDescription.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Failed to create project");
        }
      }

      await onComplete();
      toast.success("Setup complete! Welcome to Command Center.");
    } catch {
      toast.error("Something went wrong. You can finish setup in Settings.");
      await onComplete();
    } finally {
      setCompleting(false);
    }
  }, [projectName, projectDescription, onComplete]);

  const handleSkip = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finishSetup();
    }
  }, [currentStep, finishSetup]);

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-2xl px-4">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span>{STEPS[currentStep].label}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-lg border border-border bg-card p-8 shadow-lg">
          {currentStep === 0 && (
            <WelcomeStep
              displayName={displayName}
              onDisplayNameChange={setDisplayName}
              role={role}
              onRoleChange={setRole}
            />
          )}
          {currentStep === 1 && <ApiKeysStep />}
          {currentStep === 2 && <DataSourcesStep />}
          {currentStep === 3 && (
            <FirstProjectStep
              projectName={projectName}
              onProjectNameChange={setProjectName}
              projectDescription={projectDescription}
              onProjectDescriptionChange={setProjectDescription}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <Button variant="ghost" onClick={handleBack} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={handleSkip} disabled={completing}>
              Skip
            </Button>
            {isLastStep ? (
              <Button onClick={finishSetup} disabled={completing} className="gap-1.5">
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Finish Setup
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-1.5">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
