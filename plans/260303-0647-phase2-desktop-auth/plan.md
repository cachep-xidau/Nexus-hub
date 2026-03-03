---
title: "Phase 2: Desktop Auth Integration"
description: "Replace password gate with JWT auth connecting to Nexus Backend SaaS"
status: pending
priority: P1
effort: 6h
branch: main
tags: [auth, tauri, jwt, saas-migration]
created: 2026-03-03
tasks: ["#16", "#17", "#18", "#19"]
---

# Phase 2: Desktop Auth Integration

## Overview

Replace the current password-based login gate with full JWT authentication connecting to the Nexus Backend SaaS API.

**Current State:** Password gate using `VITE_LOGIN_PASSWORD` env var, stored in localStorage
**Target State:** Full email/password auth with JWT tokens via tauri-plugin-store

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Tauri Desktop App                          │
├─────────────────────────────────────────────────────────────────┤
│  App.tsx                                                        │
│    └── AuthProvider (new)                                       │
│          ├── Login.tsx (new) ──────► api-client.ts ──────┐     │
│          ├── Register.tsx (new) ───► api-client.ts ──────┤     │
│          └── Protected Routes                            │     │
│                   │                                       ▼     │
│                   └── AuthGuard ──────────────────► Nexus API   │
│                                                          (JWT) │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints (Backend)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/sign-up/email` | POST | Register new user |
| `/auth/sign-in/email` | POST | Login, returns JWT |
| `/auth/sign-out` | POST | Invalidate session |
| `/auth/session` | GET | Get current user |

## File Changes

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/auth.tsx` | AuthContext, useAuth hook, AuthProvider |
| `src/lib/api-client.ts` | Fetch wrapper with auth header injection |
| `src/pages/Login.tsx` | Login/Register form with tab switch |
| `src/pages/Register.tsx` | (Optional - can be tabs in Login.tsx) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Wrap with AuthProvider, add auth routes, remove old gate |
| `src-tauri/capabilities/default.json` | Add backend URL to http allowlist |

### Dependencies to Add

```bash
npm install @tauri-apps/plugin-store
```

## Phases

### Phase 1: API Client & Token Storage (Task #18)
**Effort:** 1.5h

- [ ] Install `@tauri-apps/plugin-store`
- [ ] Add `tauri-plugin-store` to Cargo.toml
- [ ] Create `src/lib/api-client.ts`:
  - Base URL from `VITE_API_URL` env
  - Auto-inject Authorization header from store
  - Handle 401 → clear tokens
  - Export typed request methods: `get`, `post`, `put`, `del`
- [ ] Update `capabilities/default.json` with backend URL

### Phase 2: Auth Context & Hooks (Task #17)
**Effort:** 2h
**Status:** Completed

- [x] Create `src/lib/auth.tsx`:
  - `AuthContext` with user, isLoading, error state
  - `useAuth()` hook for consuming context
  - `AuthProvider` component
  - Token storage via tauri-plugin-store (secure)
  - Methods: `login(email, password)`, `register(email, password, name?)`, `logout()`
  - Session refresh logic (check on mount, periodic refresh)
  - User type interface matching backend response

### Phase 3: Login/Register Pages (Task #19)
**Effort:** 1.5h
**Status:** Completed

- [x] Create `src/pages/Login.tsx`:
  - Email/password form
  - Tab switch for Login/Register
  - Loading states
  - Error display
  - Redirect to dashboard on success
- [x] Style with existing CSS classes (login-gate-shell, login-gate-card)

### Phase 4: App.tsx Integration (Task #16)
**Effort:** 1h

- [ ] Remove old password gate logic
- [ ] Wrap app with `AuthProvider`
- [ ] Add auth-aware routing:
  - `/login` - public
  - `/register` - public (or merge with login)
  - All other routes - protected
- [ ] Create auth guard component or use AuthProvider state
- [ ] Replace logout button to use `useAuth().logout()`

## Token Storage Strategy

```typescript
// Use tauri-plugin-store for secure storage
import { Store } from '@tauri-apps/plugin-store';

const AUTH_STORE = 'auth.json';
const TOKEN_KEY = 'access_token';
const USER_KEY = 'user';

// Store location: ~/.config/nexus-tauri/auth.json (OS-specific)
```

## Error Handling

| Error Code | Action |
|------------|--------|
| 401 | Clear tokens, redirect to login |
| 403 | Show permission error |
| 429 | Show rate limit message |
| 5xx | Show server error, retry option |
| Network | Show offline message |

## Security Considerations

1. **Token Storage:** Use tauri-plugin-store (OS keychain-backed on some platforms)
2. **Token Refresh:** Implement silent refresh before expiry
3. **Logout:** Clear all tokens, invalidate server session
4. **HTTPS Only:** Enforce in production builds

## Environment Variables

Add to `.env`:
```
VITE_API_URL=https://api.nexushub.io
```

Dev override in `.env.development`:
```
VITE_API_URL=http://localhost:3000
```

## Success Criteria

- [ ] Can register new account from desktop app
- [ ] Can login with registered credentials
- [ ] JWT token persists across app restarts
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Logout clears session and redirects to login
- [ ] Session refreshes automatically before expiry
- [ ] Network errors handled gracefully

## Risks

| Risk | Mitigation |
|------|------------|
| Backend not deployed | Use localhost fallback |
| Token expiry during use | Silent refresh logic |
| Store plugin issues | Fallback to localStorage for dev |

## Dependencies

- Nexus Backend API running (or localhost:3000)
- tauri-plugin-store installed and configured

## Next Steps

1. Start with Phase 1 (API Client) - foundation for all auth
2. Build Phase 2 (Auth Context) - state management
3. Create Phase 3 (Login UI) - user interaction
4. Integrate Phase 4 (App.tsx) - tie everything together
