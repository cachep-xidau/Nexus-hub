// ── Tauri HTTP Fetch Helper ─────────────────────────
// All cross-origin HTTP requests MUST go through this helper.
// Browser fetch() is blocked by Tauri WebView security.
// This lazily loads @tauri-apps/plugin-http to avoid module-init crashes.

let _tauriFetch: typeof globalThis.fetch | null = null;

export async function tauriFetch(
    url: string,
    options?: RequestInit
): Promise<Response> {
    if (!_tauriFetch) {
        try {
            const mod = await import('@tauri-apps/plugin-http');
            _tauriFetch = mod.fetch as unknown as typeof globalThis.fetch;
        } catch {
            // Fallback for dev-in-browser (no Tauri)
            _tauriFetch = globalThis.fetch.bind(globalThis);
        }
    }
    return _tauriFetch(url, options);
}
