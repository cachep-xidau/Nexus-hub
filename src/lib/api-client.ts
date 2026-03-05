// ── Nexus API Client ───────────────────────────────────────────────────────
// Typed HTTP client with JWT auth auto-injection and 401 handling.

import { tauriFetch } from './tauri-fetch';
import { getToken, clearToken } from './token-storage';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

// User type matching backend response
export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

// Auth response types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await getToken();
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await tauriFetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      // Handle 401 - clear tokens
      if (response.status === 401) {
        await clearToken();
        throw new Error('Unauthorized. Please login again.');
      }

      // Handle other errors
      if (!response.ok) {
        let errorText = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorText = errorData.message || errorData.error || errorText;
        } catch {
          errorText = response.statusText || errorText;
        }
        throw new Error(errorText);
      }

      // Return response data
      if (response.status === 204) {
        return {} as T;
      }

      // Guard: if the server returned HTML (e.g. Vite SPA fallback), it means
      // no backend API is running at the configured URL.
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(
          'API server is not running. The configured API URL returned an HTML page instead of JSON.'
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(credentials: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async logout(): Promise<void> {
    await this.request<void>('/auth/sign-out', { method: 'POST' });
  }

  async getSession(): Promise<User> {
    return this.request<User>('/auth/get-session');
  }

  // Generic CRUD methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async del<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const api = new ApiClient(API_URL);
