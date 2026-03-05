// ── Onboarding Storage Tests ────────────────────────────────────────────────
// Unit tests for onboarding state storage abstraction.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

// Import after setting up mock
import { getOnboardingStatus, setOnboardingCompleted } from '../src/lib/onboarding-storage';

describe('Onboarding Storage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset Tauri store mock
    (global as any).__tauri_store__ = null;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getOnboardingStatus', () => {
    it('should return default { completed: false } when no data exists', async () => {
      const status = await getOnboardingStatus();
      expect(status).toEqual({ completed: false });
    });

    it('should return stored onboarding status from localStorage', async () => {
      localStorage.setItem('nexus_onboarding_completed', JSON.stringify({ completed: true, completedAt: '2024-01-01T00:00:00Z' }));
      const status = await getOnboardingStatus();
      expect(status).toEqual({ completed: true, completedAt: '2024-01-01T00:00:00Z' });
    });

    it('should handle malformed localStorage data gracefully', async () => {
      localStorage.setItem('nexus_onboarding_completed', 'invalid json');
      const status = await getOnboardingStatus();
      expect(status.completed).toBe(false);
    });

    it('should handle null stored value gracefully', async () => {
      localStorage.setItem('nexus_onboarding_completed', 'null');
      const status = await getOnboardingStatus();
      expect(status?.completed ?? false).toBe(false);
    });
  });

  describe('setOnboardingCompleted', () => {
    it('should save completed status to localStorage', async () => {
      await setOnboardingCompleted();
      const stored = localStorage.getItem('nexus_onboarding_completed');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.completed).toBe(true);
      expect(parsed.completedAt).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/);
    });

    it('should set completedAt to current ISO timestamp', async () => {
      const before = new Date().toISOString();
      await setOnboardingCompleted();
      const after = new Date().toISOString();
      const stored = JSON.parse(localStorage.getItem('nexus_onboarding_completed')!);
      expect(new Date(stored.completedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
      expect(new Date(stored.completedAt).getTime()).toBeLessThanOrEqual(new Date(after).getTime());
    });

    it('should overwrite existing onboarding status', async () => {
      localStorage.setItem('nexus_onboarding_completed', JSON.stringify({ completed: false }));
      await setOnboardingCompleted();
      const stored = JSON.parse(localStorage.getItem('nexus_onboarding_completed')!);
      expect(stored.completed).toBe(true);
    });
  });

  describe('integration', () => {
    it('should persist and retrieve onboarding status', async () => {
      const status1 = await getOnboardingStatus();
      expect(status1.completed).toBe(false);

      await setOnboardingCompleted();

      const status2 = await getOnboardingStatus();
      expect(status2.completed).toBe(true);
      expect(status2.completedAt).toBeDefined();
    });
  });
});
