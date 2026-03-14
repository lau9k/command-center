"use client";

import { useState, useEffect, useCallback } from "react";

interface OnboardingState {
  shouldShowOnboarding: boolean;
  loading: boolean;
  completeOnboarding: () => Promise<void>;
}

export function useOnboardingState(): OnboardingState {
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/preferences?user_id=00000000-0000-0000-0000-000000000001")
      .then((res) => res.json())
      .then((json) => {
        const prefs = json.data;
        if (!prefs?.onboarding_complete) {
          setShouldShow(true);
        }
      })
      .catch(() => {
        // Silently fail — don't block dashboard
      })
      .finally(() => setLoading(false));
  }, []);

  const completeOnboarding = useCallback(async () => {
    setShouldShow(false);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
    } catch {
      // Best-effort
    }
  }, []);

  return {
    shouldShowOnboarding: shouldShow,
    loading,
    completeOnboarding,
  };
}
