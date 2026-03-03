import { openUrl as tauriOpenUrl } from '@tauri-apps/plugin-opener';

/**
 * Open an external URL using Tauri's opener plugin.
 * Falls back to window.open() in non-Tauri environments (dev browser).
 */
export async function openExternal(url: string): Promise<void> {
  try {
    await tauriOpenUrl(url);
  } catch {
    window.open(url, '_blank');
  }
}
