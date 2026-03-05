# Phase 03: AI/API & Gmail

> Parent plan: [plan.md](./plan.md)  
> Dependencies: None  
> Parallelization: Group A — runs concurrently with Phases 01, 02, 04

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-03-05 |
| Priority | P1 (High) |
| Status | pending |
| Effort | 1.5h |

## Edge Cases Fixed

| # | Edge Case | Severity |
|---|-----------|----------|
| 8 | API key in URL query params (Google AI) | High |
| 14 | Email body truncated silently | High |
| 15 | `tauriFetch` silent CORS fallback | High |
| 18 | No request timeouts | High |
| 27 | Empty API key fallthrough | Medium |
| 28 | No rate limiting on AI requests | Medium |
| 29 | AI response parsing with fragile regex | Medium |
| 30 | `chatStream` error swallowing | Medium |
| 31 | "Stream" functions don't stream | Medium |
| 32 | Gmail poller silent failure | Medium |

## File Ownership (Exclusive)

- `src/lib/ai.ts`
- `src/lib/ai-connections.ts`
- `src/lib/email-classifier.ts`
- `src/lib/gmail-poller.ts`
- `src/lib/tauri-fetch.ts`

## Implementation Steps

### Step 1: Add timeout wrapper to `tauriFetch` (`tauri-fetch.ts`)

```typescript
const DEFAULT_TIMEOUT_MS = 30_000;

export async function tauriFetch(
    url: string,
    options?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options || {};
    
    if (!_tauriFetch) { /* ... existing lazy init ... */ }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
        return await _tauriFetch(url, {
            ...fetchOptions,
            signal: controller.signal,
        });
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms: ${url.split('?')[0]}`);
        }
        throw e;
    } finally {
        clearTimeout(timeoutId);
    }
}
```

Also add a warning log when falling back to browser fetch in Tauri:
```typescript
if (hasTauriRuntime()) {
    try {
        const mod = await import('@tauri-apps/plugin-http');
        _tauriFetch = mod.fetch as unknown as typeof globalThis.fetch;
    } catch (e) {
        console.warn('[tauriFetch] Tauri HTTP plugin unavailable, falling back to browser fetch. CORS may block requests.', e);
        _tauriFetch = globalThis.fetch.bind(globalThis);
    }
}
```

### Step 2: Fix empty API key fallthrough in `ai.ts`

Add early guard at the start of each stream/provider function:

```typescript
async function streamGLK5(messages: ..., onChunk: ...) {
    const token = await getActiveApiKey('glk5') || await getSetting('glk5_api_key');
    if (!token) {
        throw new Error('GLK-5 API key not configured. Go to Settings → AI Connections.');
    }
    // ... rest of function
}
```

Apply same pattern to `streamGoogleAI`, `streamOpenAI`, and all cases in `generateCompletion`.

### Step 3: Move Google AI key from URL to header (`ai.ts`)

Replace `?key=${key}` with POST body or header:

```typescript
// BEFORE:
const res = await tauriFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,

// AFTER:
const res = await tauriFetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
    {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
        },
        body: JSON.stringify({ contents }),
    }
);
```

Apply same fix in `email-classifier.ts`.

### Step 4: Fix `chatStream` error handling (`ai.ts`)

Add an `onError` callback alongside `onChunk`/`onDone`:

```typescript
export async function chatStream(
    messages: { role: string; content: string }[],
    onChunk: (text: string) => void,
    onDone: () => void,
    onError?: (error: Error) => void,
) {
    try {
        // ... provider switch ...
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (onError) {
            onError(err);
        } else {
            onChunk(`\n\n⚠️ Error: ${err.message}`);
        }
    } finally {
        onDone();
    }
}
```

### Step 5: Add simple rate limiter for AI requests (`ai.ts`)

```typescript
let _lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000; // 1 second between requests

async function rateLimitGuard(): Promise<void> {
    const now = Date.now();
    const elapsed = now - _lastRequestTime;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
    }
    _lastRequestTime = Date.now();
}
```

Call `await rateLimitGuard()` at the top of `chatStream` and `generateCompletion`.

### Step 6: Fix AI classification response validation (`email-classifier.ts`)

```typescript
// AFTER regex match and JSON.parse:
if (match) {
    try {
        const categories: string[] = JSON.parse(match[0]);
        if (!Array.isArray(categories)) throw new Error('Not an array');
        
        return emails.map((e, i) => ({
            ...e,
            category: (i < categories.length && categories[i] in EMAIL_CATEGORIES)
                ? categories[i] as EmailCategory
                : classifyByRules(e),
        }));
    } catch (parseError) {
        console.warn('[Classifier] AI response parse failed, using rules:', parseError);
    }
}
```

### Step 7: Add truncation flag and logging to `gmail-poller.ts`

```typescript
// Line 65: Add truncation indicator
const isTruncated = bodyText.length > 2000;
emails.push({
    // ... existing fields ...
    body: isTruncated ? bodyText.slice(0, 2000) + '\n[...truncated]' : bodyText,
    // ...
});

// Line 71: Add error logging instead of silent catch
} catch (msgErr) {
    console.warn(`[Gmail] Failed to fetch message ${item.id}:`, msgErr instanceof Error ? msgErr.message : msgErr);
}

// Line 93-95: Log skipped accounts
const accessToken = await refreshAccountToken(account.id);
if (!accessToken) {
    console.warn(`[Gmail] Token refresh failed for account ${account.id}, skipping`);
    continue;
}
```

### Step 8: Encrypt AI API keys in `ai-connections.ts`

Import `encrypt`/`decrypt` from crypto module and encrypt apiKey before storage:

```typescript
import { encrypt, decrypt } from './crypto';

export async function addConnection(conn: Omit<AIConnection, 'id' | 'createdAt'>): Promise<AIConnection> {
    const conns = await getConnections();
    const newConn: AIConnection = {
        ...conn,
        id: genId(),
        apiKey: await encrypt(conn.apiKey),  // Encrypt before storage
        createdAt: new Date().toISOString(),
    };
    // ...
}

export async function getActiveApiKey(provider: string): Promise<string | null> {
    const conn = await getActiveConnection(provider);
    if (!conn?.apiKey) return null;
    return decrypt(conn.apiKey);  // Decrypt on retrieval
}
```

## Conflict Prevention

- Only modifies `ai.ts`, `ai-connections.ts`, `email-classifier.ts`, `gmail-poller.ts`, `tauri-fetch.ts`.
- Does NOT modify `db.ts` (Phase 2), `auth.tsx` (Phase 4), or Rust files (Phase 1).

## Success Criteria

- [ ] All `tauriFetch` calls have 30s timeout
- [ ] Empty API keys fail fast with clear error message
- [ ] Google AI key sent via `x-goog-api-key` header, not URL
- [ ] `chatStream` has optional `onError` callback
- [ ] Rate limiter prevents >1 req/sec
- [ ] Email classifier handles malformed AI responses gracefully
- [ ] Gmail poller logs skipped messages and failed accounts
- [ ] AI API keys encrypted in storage
