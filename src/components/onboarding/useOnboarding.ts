// ── Onboarding Hook ───────────────────────────────────────────────────────
// Manages onboarding overlay state with persistent storage.

import { useState, useEffect, useCallback } from 'react';
import {
  getOnboardingStatus,
  setOnboardingCompleted,
  type OnboardingStatus,
} from '../../lib/onboarding-storage';

export function useOnboarding() {
  const [status, setStatus] = useState<OnboardingStatus>({ completed: false });
  const [isLoading, setIsLoading] = useState(true);

  // Load onboarding status on mount
  useEffect(() => {
    getOnboardingStatus()
      .then((s) => {
        setStatus(s);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  // Mark onboarding as completed
  const completeOnboarding = useCallback(async () => {
    await setOnboardingCompleted();
    setStatus({ completed: true, completedAt: new Date().toISOString() });
  }, []);

  return {
    isCompleted: status.completed,
    isLoading,
    completeOnboarding,
  };
}
