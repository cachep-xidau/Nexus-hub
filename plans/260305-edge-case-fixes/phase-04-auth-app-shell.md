# Phase 04: Auth & App Shell

> Parent plan: [plan.md](./plan.md)  
> Dependencies: None  
> Parallelization: Group A — runs concurrently with Phases 01, 02, 03

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-03-05 |
| Priority | P0/P1 |
| Status | pending |
| Effort | 1h |

## Edge Cases Fixed

| # | Edge Case | Severity |
|---|-----------|----------|
| 3 | Hardcoded encryption passphrase | Critical |
| 4 | Encryption fallback leaks plaintext | Critical |
| 6 | Deprecated OAuth OOB flow | Critical |
| 10 | Login gate bypass `DISABLE_LOGIN_GATE` | High |
| 13 | `AppErrorBoundary` misses async errors | High |
| 16 | `getUser()` crashes on corrupt localStorage | High |
| 17 | Session/login race condition | High |
| 37 | `ProtectedRoute` infinite loading | Low |
| 38 | `seedKnowledge` idempotency | Low |
| 39 | Offline banner without actual queue pausing | Low |
| 40 | Token without expiry check | Low |

## File Ownership (Exclusive)

- `src/lib/crypto.ts`
- `src/lib/auth.tsx`
- `src/lib/token-storage.ts`
- `src/App.tsx`
- `src/components/layout/app-error-boundary.tsx`
- `src/lib/query-client.ts` (if exists, for networkMode)
- `src/lib/gmail-auth.ts`

## Implementation Steps

### Step 1: Fix hardcoded passphrase in `crypto.ts`

Replace hardcoded passphrase with a machine-derived one:

```typescript
// Generate passphrase from multiple machine-specific signals
async function getMachinePassphrase(): Promise<string> {
    // In Tauri: use a combination of app data path + fixed salt
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        try {
            const { appDataDir } = await import('@tauri-apps/api/path');
            const dataDir = await appDataDir();
            return `nexus-${dataDir}-v2`;
        } catch {
            // Fallback
        }
    }
    // Browser fallback: generate and store a random key in localStorage
    const stored = localStorage.getItem('nexus_enc_key');
    if (stored) return stored;
    const key = crypto.randomUUID();
    localStorage.setItem('nexus_enc_key', key);
    return key;
}

// Cache the passphrase promise
let _passphrase: Promise<string> | null = null;
function getPassphrase(): Promise<string> {
    if (!_passphrase) _passphrase = getMachinePassphrase();
    return _passphrase;
}
```

Update `deriveKey` to use `await getPassphrase()` instead of the hardcoded constant.

### Step 2: Remove plaintext fallback in `encrypt()` (`crypto.ts`)

```typescript
export async function encrypt(plaintext: string): Promise<string> {
    const passphrase = await getPassphrase();
    const key = await deriveKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const enc = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
        { name: ALGO, iv }, key, enc.encode(plaintext)
    );
    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return btoa(String.fromCharCode(...combined));
    // NO fallback — let the error propagate
}
```

Keep backward compat in `decrypt()` for existing `plain:` prefixed values (migration path).

### Step 3: Fix `getUser()` JSON parse crash (`token-storage.ts`)

```typescript
export async function getUser(): Promise<any | null> {
    const store = await getStore();
    if (store) {
        return await store.get(USER_KEY) as any | null;
    }
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch {
        console.warn('[TokenStorage] Corrupt user data in localStorage, clearing');
        localStorage.removeItem(USER_KEY);
        return null;
    }
}
```

### Step 4: Fix session/login race condition (`auth.tsx`)

Use an `AbortController`-style flag to cancel stale session checks:

```typescript
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUserState] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const sessionCheckId = useRef(0);

    useEffect(() => {
        const thisCheckId = ++sessionCheckId.current;
        checkSession(thisCheckId);
    }, []);

    async function checkSession(checkId: number) {
        try {
            const session = await api.getSession();
            // Only apply if this is still the latest check
            if (checkId !== sessionCheckId.current) return;
            const authUser: AuthUser = { ... };
            setUserState(authUser);
            await setUser(authUser);
        } catch {
            if (checkId !== sessionCheckId.current) return;
            setUserState(null);
            await clearUser();
        } finally {
            if (checkId === sessionCheckId.current) {
                setIsLoading(false);
            }
        }
    }

    async function login(email: string, password: string) {
        sessionCheckId.current++; // Invalidate any pending session check
        setIsLoading(true);
        // ... rest unchanged
    }
```

### Step 5: Guard `DISABLE_LOGIN_GATE` with dev-only check (`App.tsx`)

```typescript
const DISABLE_LOGIN_GATE = import.meta.env.DEV && import.meta.env.VITE_DISABLE_LOGIN_GATE === 'true';
```

This ensures the login gate can ONLY be disabled in development mode — never in production builds.

### Step 6: Add global async error handler (`app-error-boundary.tsx`)

Add a `useEffect` in the app shell to catch unhandled promise rejections:

```typescript
// In App.tsx — add inside AppContent():
useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
        console.error('[App] Unhandled rejection:', event.reason);
        // Optionally show toast notification
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
}, []);
```

### Step 7: Add loading timeout to `ProtectedRoute` (`App.tsx`)

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuth();
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (!isLoading) return;
        const timer = setTimeout(() => setTimedOut(true), 10_000);
        return () => clearTimeout(timer);
    }, [isLoading]);

    if (DISABLE_LOGIN_GATE) return <>{children}</>;

    if (timedOut) {
        return (
            <div className="login-gate-shell">
                <div className="login-gate-card">
                    <p>Connection timed out. Please reload.</p>
                    <button onClick={() => window.location.reload()}>Reload</button>
                </div>
            </div>
        );
    }
    if (isLoading) return /* loading spinner */;
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
}
```

### Step 8: Fix seed idempotency and offline handling (`App.tsx`)

```typescript
// Seed with check (already happening in seedDemoData, ensure seedKnowledge does same)
useEffect(() => {
    if (!effectiveUser || !hasTauriRuntime()) return;
    // These functions must internally check if already seeded:
    syncOnlineCredentialsToLocalSettings().catch(e => console.warn('[Credentials]', e));
    seedDemoData().catch(() => {});
    seedKnowledge().catch(e => console.warn('[Knowledge]', e));
}, [effectiveUser]);
```

### Step 9: Fix OAuth OOB deprecation (`gmail-auth.ts`)

Replace `urn:ietf:wg:oauth:2.0:oob` with loopback redirect:

```typescript
const REDIRECT_URI = 'http://127.0.0.1';

export function buildOAuthUrl(clientId: string): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}
```

And update the token exchange to use the same redirect URI.

> **Note**: Full OAuth loopback implementation requires a local HTTP server to capture the callback. For now, switch to `http://127.0.0.1` which Google supports. A more complete implementation would use Tauri's deep-link plugin.

## Conflict Prevention

- Owns: `crypto.ts`, `auth.tsx`, `token-storage.ts`, `App.tsx`, `app-error-boundary.tsx`, `gmail-auth.ts`
- Does NOT modify: `db.ts` (Phase 2), `ai.ts` (Phase 3), Rust files (Phase 1)
- `query-client.ts` may need `networkMode` config update — verify it's not owned by another phase

## Success Criteria

- [ ] Encryption passphrase derived from machine-specific value, not hardcoded
- [ ] No `plain:` prefix fallback in `encrypt()`
- [ ] `getUser()` handles corrupt JSON gracefully
- [ ] Login doesn't race with session check
- [ ] `DISABLE_LOGIN_GATE` only works in dev mode
- [ ] Global unhandled rejection listener logs errors
- [ ] `ProtectedRoute` has 10s timeout fallback
- [ ] OAuth uses `http://127.0.0.1` redirect instead of OOB
