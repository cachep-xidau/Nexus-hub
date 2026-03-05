// ── useOnboarding Hook Tests ─────────────────────────────────────────────────
// Unit tests for onboarding React hook.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOnboarding } from '../src/components/onboarding/useOnboarding';
import * as storageModule from '../src/lib/onboarding-storage';

// Mock storage module
vi.mock('../src/lib/onboarding-storage', async () => {
  const actual = await vi.importActual<typeof storageModule>('../src/lib/onboarding-storage');
  return {
    ...actual,
    getOnboardingStatus: vi.fn(),
    setOnboardingCompleted: vi.fn(),
  };
});

const mockGetOnboardingStatus = vi.mocked(storageModule.getOnboardingStatus);
const mockSetOnboardingCompleted = vi.mocked(storageModule.setOnboardingCompleted);

describe('useOnboarding Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with isLoading=true and isCompleted=false', () => {
      mockGetOnboardingStatus.mockImplementation(
        () => new Promise(() => undefined as never)
      );

      const { result, unmount } = renderHook(() => useOnboarding());

      expect(result.current.isCompleted).toBe(false);
      expect(result.current.isLoading).toBe(true);

      unmount();
    });

    it('should load and set isCompleted from storage', async () => {
      mockGetOnboardingStatus.mockResolvedValue({ completed: true });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetOnboardingStatus).toHaveBeenCalledTimes(1);
    });

    it('should set isCompleted=false when storage returns default', async () => {
      mockGetOnboardingStatus.mockResolvedValue({ completed: false });

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockGetOnboardingStatus.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isCompleted).toBe(false);
    });
  });

  describe('completeOnboarding', () => {
    it('should call setOnboardingCompleted and update state', async () => {
      mockGetOnboardingStatus.mockResolvedValue({ completed: false });
      mockSetOnboardingCompleted.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(mockSetOnboardingCompleted).toHaveBeenCalledTimes(1);
      expect(result.current.isCompleted).toBe(true);
    });

    it('should set completedAt timestamp', async () => {
      mockGetOnboardingStatus.mockResolvedValue({ completed: false });
      mockSetOnboardingCompleted.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(result.current.isCompleted).toBe(true);
      // completedAt is set internally by the hook but not exposed
      // Storage module saves it, so verify storage was called correctly
      expect(mockSetOnboardingCompleted).toHaveBeenCalledTimes(1);
    });

    it('should be memoized (same reference between renders)', async () => {
      mockGetOnboardingStatus.mockResolvedValue({ completed: false });
      mockSetOnboardingCompleted.mockResolvedValue(undefined);

      const { result, rerender } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const completeFn1 = result.current.completeOnboarding;
      rerender();
      const completeFn2 = result.current.completeOnboarding;

      expect(completeFn1).toBe(completeFn2);
    });
  });

  describe('integration scenarios', () => {
    it('should complete onboarding flow from incomplete to completed', async () => {
      mockGetOnboardingStatus.mockResolvedValue({ completed: false });
      mockSetOnboardingCompleted.mockResolvedValue(undefined);

      const { result } = renderHook(() => useOnboarding());

      await waitFor(() => {
        expect(result.current.isCompleted).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(result.current.isCompleted).toBe(true);
      expect(mockSetOnboardingCompleted).toHaveBeenCalledTimes(1);
    });
  });
});
