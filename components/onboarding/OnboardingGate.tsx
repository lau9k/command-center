"use client";

import { useOnboardingState } from "./useOnboardingState";
import { OnboardingWizard } from "./OnboardingWizard";

interface OnboardingGateProps {
  children: React.ReactNode;
}

export function OnboardingGate({ children }: OnboardingGateProps) {
  const { shouldShowOnboarding, loading, completeOnboarding } = useOnboardingState();

  if (loading) {
    return <>{children}</>;
  }

  if (shouldShowOnboarding) {
    return (
      <>
        {children}
        <OnboardingWizard onComplete={completeOnboarding} />
      </>
    );
  }

  return <>{children}</>;
}
