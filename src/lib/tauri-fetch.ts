// ── Tauri HTTP Fetch Helper ─────────────────────────
// All cross-origin HTTP requests MUST go through this helper.
// Browser fetch() is blocked by Tauri WebView security.
// This lazily loads @tauri-apps/plugin-http to avoid module-init crashes.

let _tauriFetch: typeof globalThis.fetch | null = null;

const DEFAULT_TIMEOUT_MS = 30_000;

function hasTauriRuntime(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function tauriFetch(
    url: string,
    options?: RequestInit & { timeoutMs?: number }
): Promise<Response> {
    if (!_tauriFetch) {
        if (hasTauriRuntime()) {
            try {
                const mod = await import('@tauri-apps/plugin-http');
                _tauriFetch = mod.fetch as unknown as typeof globalThis.fetch;
            } catch (e) {
                console.warn('[tauriFetch] Tauri HTTP plugin unavailable, falling back to browser fetch. CORS may block requests.', e);
                _tauriFetch = globalThis.fetch.bind(globalThis);
            }
        } else {
            _tauriFetch = globalThis.fetch.bind(globalThis);
        }
    }

    const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options || {};

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
