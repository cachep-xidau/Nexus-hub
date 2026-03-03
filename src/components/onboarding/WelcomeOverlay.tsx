// ── Welcome Overlay ────────────────────────────────────────────────────────
// First-time user welcome overlay shown on dashboard.

import { useEffect, useCallback, type KeyboardEvent } from 'react';
import { Zap, Layout, Bot, Shield } from 'lucide-react';

interface WelcomeOverlayProps {
  onComplete: () => void;
}

export function WelcomeOverlay({ onComplete }: WelcomeOverlayProps) {
  // Handle Escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent | globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete();
      }
    },
    [onComplete]
  );

  // Add keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const features = [
    { icon: Bot, title: 'AI Agent Hub', desc: 'Chat with AI, automate tasks' },
    { icon: Layout, title: 'Kanban Boards', desc: 'Organize projects visually' },
    { icon: Zap, title: 'Quick Actions', desc: 'Fast access to workflows' },
    { icon: Shield, title: 'Secure & Private', desc: 'Your data stays local' },
  ];

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      aria-describedby="welcome-desc"
    >
      <div className="login-gate-card" style={{ maxWidth: '480px' }}>
        <h1 id="welcome-title">Welcome to Nexus</h1>
        <p id="welcome-desc" style={{ color: 'var(--text-muted)' }}>
          Your AI-powered productivity hub. Let's get you started.
        </p>

        {/* Feature highlights */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--space-3)',
            margin: 'var(--space-4) 0',
          }}
        >
          {features.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
              }}
            >
              <Icon
                size={20}
                style={{ flexShrink: 0, color: 'var(--accent)' }}
                aria-hidden="true"
              />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="btn btn-primary login-gate-submit"
          onClick={onComplete}
          autoFocus
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
