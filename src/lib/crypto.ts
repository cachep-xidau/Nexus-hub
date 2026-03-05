// ── AES-GCM Encryption for Sensitive Data ─────────────
// Uses Web Crypto API (available in both browser and Tauri WebView)

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Derive a stable encryption key from a passphrase
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('nexus-hub-salt-v2'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// ── Machine-specific passphrase ─────────────────────
// Uses app data path in Tauri or a stored random key in browser.
// Never hardcoded in source.
let _passphrasePromise: Promise<string> | null = null;

async function getMachinePassphrase(): Promise<string> {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { appDataDir } = await import('@tauri-apps/api/path');
      const dataDir = await appDataDir();
      return `nexus-enc-${dataDir}-v2`;
    } catch { /* fall through */ }
  }
  // Browser fallback: generate and persist a random key
  const LS_KEY = 'nexus_enc_key_v2';
  const stored = localStorage.getItem(LS_KEY);
  if (stored) return stored;
  const key = crypto.randomUUID();
  localStorage.setItem(LS_KEY, key);
  return key;
}

function getPassphrase(): Promise<string> {
  if (!_passphrasePromise) _passphrasePromise = getMachinePassphrase();
  return _passphrasePromise;
}

// Legacy hardcoded passphrase for decrypting old data
const LEGACY_PASSPHRASE = 'nexus-hub-gmail-encryption-key-2024';

export async function encrypt(plaintext: string): Promise<string> {
  const passphrase = await getPassphrase();
  const key = await deriveKey(passphrase);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(plaintext)
  );
  // Combine IV + ciphertext → base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
  // No plaintext fallback — encryption failures propagate as errors
}

export async function decrypt(encoded: string): Promise<string> {
  try {
    // Handle unencrypted legacy values
    if (encoded.startsWith('plain:')) return encoded.slice(6);
    if (!encoded || encoded.length < 20) return encoded;

    // Try current key first
    try {
      const passphrase = await getPassphrase();
      const key = await deriveKey(passphrase);
      const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const iv = combined.slice(0, IV_LENGTH);
      const ciphertext = combined.slice(IV_LENGTH);
      const decrypted = await crypto.subtle.decrypt(
        { name: ALGO, iv }, key, ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      // Fallback: try legacy key for data encrypted with old hardcoded passphrase
      const legacyKey = await deriveKey(LEGACY_PASSPHRASE);
      const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
      const iv = combined.slice(0, IV_LENGTH);
      const ciphertext = combined.slice(IV_LENGTH);
      const decrypted = await crypto.subtle.decrypt(
        { name: ALGO, iv }, legacyKey, ciphertext
      );
      return new TextDecoder().decode(decrypted);
    }
  } catch (e) {
    console.error('Decryption failed, returning raw value:', e);
    return encoded;
  }
}
