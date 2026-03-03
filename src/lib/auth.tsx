// ── Auth Context & Hooks ───────────────────────────────────────────────────
// React Context for authentication state and JWT token management.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api-client';
import { setToken, setUser, clearToken, clearUser } from './token-storage';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const session = await api.getSession();
      const authUser: AuthUser = {
        id: session.id,
        email: session.email,
        name: session.name || null,
        emailVerified: null, // Backend may add this field
      };
      setUserState(authUser);
      await setUser(authUser);
    } catch {
      setUserState(null);
      await clearUser();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.login({ email, password });
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || null,
        emailVerified: null,
      };
      setUserState(authUser);
      await setToken(response.token);
      await setUser(authUser);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }

  async function register(email: string, password: string, name?: string): Promise<void> {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.register({ email, password, name });
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name || null,
        emailVerified: null,
      };
      setUserState(authUser);
      await setToken(response.token);
      await setUser(authUser);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }

  async function logout(): Promise<void> {
    setIsLoading(true);
    try {
      await api.logout();
    } catch {
      // Continue with local logout even if API call fails
    } finally {
      setUserState(null);
      await clearToken();
      await clearUser();
      setIsLoading(false);
    }
  }

  function clearError(): void {
    setError(null);
  }

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
