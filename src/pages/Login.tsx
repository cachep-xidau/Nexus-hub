// ── Login/Register Page ─────────────────────────────────────────────────────
// Authentication form with tab switch for login and register modes.

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type AuthMode = 'login' | 'register';

export function Login() {
  const navigate = useNavigate();
  const { login, register, isLoading, error, clearError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setValidationError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    // Validate password length
    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name || undefined);
      }
      navigate('/');
    } catch (e) {
      // Error is handled by useAuth hook
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="login-gate-shell">
      <form className="login-gate-card" onSubmit={handleSubmit}>
        <h1>Nexus Hub</h1>
        <p>{isRegister ? 'Create your account to continue.' : 'Enter your credentials to continue.'}</p>

        {/* Tab Switch */}
        <div className="flex gap-2" style={{ marginTop: 'var(--space-2)' }}>
          <button
            type="button"
            className={`btn btn-sm ${!isRegister ? 'btn-primary' : ''}`}
            onClick={() => setMode('login')}
            disabled={isLoading}
          >
            Login
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isRegister ? 'btn-primary' : ''}`}
            onClick={() => setMode('register')}
            disabled={isLoading}
          >
            Register
          </button>
        </div>

        {/* Name field (register only) */}
        {isRegister && (
          <input
            type="text"
            className="form-input"
            autoComplete="name"
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        )}

        {/* Email field */}
        <input
          type="email"
          className="form-input"
          autoComplete={isRegister ? 'email' : 'username'}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          required
        />

        {/* Password field */}
        <input
          type="password"
          className="form-input"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          required
          minLength={8}
        />

        {/* Error display */}
        {(validationError || error) ? <div className="login-gate-error">{validationError || error}</div> : null}

        {/* Submit button */}
        <button
          type="submit"
          className="btn btn-primary login-gate-submit"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
