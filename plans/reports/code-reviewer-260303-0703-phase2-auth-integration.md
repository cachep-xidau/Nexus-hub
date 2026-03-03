# Code Review: Phase 2 Auth Integration

**Reviewer:** code-reviewer agent
**Date:** 2026-03-03
**Scope:** Auth context, API client, token storage, login page, app integration

---

## Scope

- **Files:**
  - `src/lib/auth.tsx` (140 lines)
  - `src/lib/api-client.ts` (145 lines)
  - `src/lib/token-storage.ts` (84 lines)
  - `src/lib/tauri-fetch.ts` (23 lines)
  - `src/pages/Login.tsx` (128 lines)
  - `src/App.tsx` (105 lines)
- **Total LOC:** ~625 lines
- **Focus:** Recent Phase 2 auth implementation

---

## Overall Assessment

**Quality Score: 7.5/10**

Solid implementation with good separation of concerns, proper TypeScript typing, and Tauri-specific handling. The code follows React best practices and has a clean architecture. However, there are several security concerns and edge cases that need attention.

---

## Critical Issues

### 1. Missing API URL in CSP and HTTP Capabilities (SECURITY)

**File:** `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`

The `VITE_API_URL` (backend API) is NOT in the CSP `connect-src` directive or HTTP capabilities allowlist. This will cause:
- CSP violations when making API calls
- HTTP plugin blocking requests

**Current CSP:**
```
connect-src 'self' http://localhost:* https://api.openai.com ...
```

**Current HTTP capabilities:** Only lists Slack, Google, OpenAI, etc. - NOT the auth backend.

**Impact:** Production builds will fail to communicate with auth backend.

**Fix Required:** Add backend URL to both files:
```json
// capabilities/default.json - add to http:default allow list:
{ "url": "https://api.nexushub.io/**" },
{ "url": "http://localhost:3000/**" }

// tauri.conf.json - add to connect-src:
https://api.nexushub.io http://localhost:3000
```

---

### 2. Token Stored in localStorage (Fallback) is Vulnerable to XSS

**File:** `src/lib/token-storage.ts:33, 42`

When Tauri store fails, tokens fall back to localStorage which is accessible by any JavaScript. While Tauri WebView has better isolation than browsers, this is still a risk for:
- Malicious npm packages
- Compromised dependencies
- Dev mode in browser

**Recommendation:** Consider:
1. Using `httpOnly` cookies for token storage (backend sets cookie)
2. Or: Warn users when running in browser mode about reduced security
3. Or: Use Tauri's secure storage plugin instead of store plugin

---

### 3. Missing CSRF Protection

**File:** `src/lib/api-client.ts:58-62`

Using `credentials: 'include'` without CSRF token protection makes the app vulnerable to cross-site request forgery if cookies are ever used.

**Recommendation:** If backend supports CSRF tokens, add them to requests.

---

## High Priority

### 4. Race Condition in Session Check

**File:** `src/lib/auth.tsx:41-43`

```tsx
useEffect(() => {
  checkSession();
}, []);
```

`checkSession()` is async but not awaited. Multiple rapid mounts could cause race conditions.

**Fix:**
```tsx
useEffect(() => {
  let cancelled = false;
  checkSession();
  return () => { cancelled = true; };

  async function checkSession() {
    // ... check cancelled flag before setState
  }
}, []);
```

---

### 5. No Token Expiry Handling

**File:** `src/lib/auth.tsx`, `src/lib/api-client.ts`

JWT tokens expire but there's no:
- Token expiry check before use
- Automatic token refresh
- Proactive session renewal

**Impact:** Users get abruptly logged out when token expires.

**Recommendation:** Implement token refresh or at least decode JWT and check expiry before API calls.

---

### 6. Error Handling Uses `alert()` in Login

**File:** `src/pages/Login.tsx:25-26, 31-32`

```tsx
if (!emailRegex.test(email)) {
  alert('Please enter a valid email address');
```

Using `alert()` is poor UX and blocks the UI thread.

**Fix:** Use the existing error state pattern:
```tsx
setError('Please enter a valid email address');
return;
```

---

### 7. Password Validation Only on Client

**File:** `src/pages/Login.tsx:30-33`

8-character minimum is only enforced client-side. Backend may have different requirements, causing confusing error messages.

**Recommendation:** Ensure backend validates and returns clear error messages.

---

## Medium Priority

### 8. TypeScript `any` in token-storage

**File:** `src/lib/token-storage.ts:56, 65`

```tsx
export async function getUser(): Promise<any | null>
export async function setUser(user: any): Promise<void>
```

Uses `any` type, losing type safety.

**Fix:**
```tsx
export async function getUser(): Promise<AuthUser | null>
export async function setUser(user: AuthUser): Promise<void>
```

---

### 9. API Client Error Message Could Leak Info

**File:** `src/lib/api-client.ts:72-79`

Error messages from backend are passed through directly. Could leak internal details.

**Recommendation:** Sanitize error messages for production, or ensure backend returns user-safe messages.

---

### 10. No Request Timeout

**File:** `src/lib/api-client.ts`

No timeout on requests. Hung requests will leave users in loading state indefinitely.

**Fix:** Add AbortController with timeout:
```tsx
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
// ... pass signal to fetch
```

---

### 11. Store Singleton Not Thread-Safe

**File:** `src/lib/token-storage.ts:9-10, 13-26`

```tsx
let _store: any = null;
let _storeLoaded = false;
```

Multiple concurrent `getStore()` calls could race during initial load.

**Fix:** Use promise caching:
```tsx
let _storePromise: Promise<any> | null = null;
async function getStore() {
  if (!_storePromise) {
    _storePromise = loadStore();
  }
  return _storePromise;
}
```

---

### 12. ProtectedRoute Re-renders on Every Auth State Change

**File:** `src/App.tsx:23-41`

Each protected route wraps children in `ProtectedRoute`, causing extra renders.

**Minor optimization:** Consider layout-based protection instead of per-route.

---

## Low Priority

### 13. Hardcoded Loading Text

**File:** `src/App.tsx:30, 57`

```tsx
<p>Loading...</p>
```

No loading spinner, just text. Minor UX improvement.

---

### 14. Console Warnings in Production

**File:** `src/App.tsx:48, 50`

```tsx
console.warn('[Credentials] Sync skipped:', e);
```

Console logs/warns should be stripped in production builds.

---

### 15. No Input Sanitization on Name Field

**File:** `src/pages/Login.tsx:39`

```tsx
await register(email, password, name || undefined);
```

Name field has no length limit or character restriction. Could submit very long strings or special characters.

---

## Edge Cases & Missing Scenarios

| Scenario | Current Behavior | Risk |
|----------|------------------|------|
| Network offline during login | Generic "Network error" | Medium - poor UX |
| Token corrupted in storage | Silent failure | Low |
| Backend returns 500 | Generic error message | Low |
| User attempts login while already logged in | Creates new session | Low |
| Rapid login/logout clicks | Race conditions possible | Medium |
| Session expires during API call | 401 handled, user logged out | Low - acceptable |

---

## Positive Observations

1. **Clean separation of concerns:** Auth, API, storage all properly separated
2. **Good TypeScript coverage:** Interfaces for User, AuthResponse, etc.
3. **Tauri-aware:** Proper use of tauri-plugin-http and tauri-plugin-store
4. **Graceful fallbacks:** Browser dev mode works with localStorage fallback
5. **Error state management:** Centralized error handling in context
6. **Loading states:** Proper isLoading tracking throughout
7. **Auto-clear error:** clearError on new submission attempt

---

## Recommended Actions

### Must Fix (Before Production)
1. Add backend URL to CSP `connect-src` and HTTP capabilities
2. Replace `alert()` with error state in Login component
3. Fix race condition in store initialization

### Should Fix (Soon)
4. Implement token refresh or expiry handling
5. Type the `getUser`/`setUser` functions properly
6. Add request timeout to API client
7. Add cancellation to session check effect

### Nice to Have
8. Add loading spinner instead of text
9. Strip console logs in production
10. Add input length limits on name field
11. Consider httpOnly cookies for token storage

---

## Metrics

| Metric | Value |
|--------|-------|
| Type Coverage | ~90% (some `any` types) |
| Error Handling | Good (try/catch present) |
| Security Score | 6/10 (CSP/localStorage concerns) |
| Code Organization | Excellent |
| React Best Practices | Good |

---

## Unresolved Questions

1. Does backend support token refresh? (needed for proper expiry handling)
2. Should httpOnly cookies be used instead of client-side token storage?
3. What is the expected token lifetime from the backend?
4. Should the app work offline with cached credentials?
