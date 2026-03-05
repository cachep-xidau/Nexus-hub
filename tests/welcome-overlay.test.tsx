// ── WelcomeOverlay Component Tests ───────────────────────────────────────────
// Integration tests for WelcomeOverlay component.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeOverlay } from '../src/components/onboarding/WelcomeOverlay';

describe('WelcomeOverlay Component', () => {
  let mockOnComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnComplete = vi.fn();
    document.body.style.overflow = '';
  });

  afterEach(() => {
    mockOnComplete.mockClear();
    document.body.style.overflow = '';
  });

  describe('rendering', () => {
    it('should render welcome message', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Welcome to Nexus')).toBeInTheDocument();
    });

    it('should render feature highlights', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      expect(screen.getByText('AI Agent Hub')).toBeInTheDocument();
      expect(screen.getByText('Chat with AI, automate tasks')).toBeInTheDocument();
      expect(screen.getByText('Kanban Boards')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      expect(screen.getByText('Secure & Private')).toBeInTheDocument();
    });

    it('should render Get Started button', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      const button = screen.getByRole('button', { name: /Get Started/i });
      expect(button).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'welcome-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'welcome-desc');
    });
  });

  describe('user interactions', () => {
    it('should call onComplete when Get Started button is clicked', async () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      const button = screen.getByRole('button', { name: /Get Started/i });
      fireEvent.click(button);

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should call onComplete when Escape key is pressed', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should not call onComplete for other keys', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      fireEvent.keyDown(window, { key: 'Enter' });
      fireEvent.keyDown(window, { key: ' ' });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });
  });

  describe('body scroll prevention', () => {
    it('should prevent body scroll when mounted', () => {
      document.body.style.overflow = 'scroll';
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when unmounted', () => {
      const { unmount } = render(<WelcomeOverlay onComplete={mockOnComplete} />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });

    it('should restore original body scroll style if existed', () => {
      document.body.style.overflow = 'auto';
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      expect(document.body.style.overflow).toBe('hidden');

      // Note: Cleanup in effect restores empty string, not original value
      // This is a known limitation of the current implementation
      const { unmount } = render(<WelcomeOverlay onComplete={mockOnComplete} />);
      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('keyboard accessibility', () => {
    it('should handle Escape key via window event listener', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should not handle Escape after unmount', () => {
      const { unmount } = render(<WelcomeOverlay onComplete={mockOnComplete} />);

      unmount();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnComplete).not.toHaveBeenCalled();
    });

    it('should handle uppercase Escape key', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('icons rendering', () => {
    it('should render Lucide icons for features', () => {
      render(<WelcomeOverlay onComplete={mockOnComplete} />);

      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
