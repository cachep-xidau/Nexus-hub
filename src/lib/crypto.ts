// ── AES-GCM Encryption for Sensitive Data ─────────────
// Uses Web Crypto API (available in both browser and Tauri WebView)

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

// Derive a stable encryption key from a passphrase (machine-specific)
async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('nexus-hub-salt-v1'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Use a stable passphrase derived from app identity
const PASSPHRASE = 'nexus-hub-gmail-encryption-key-2024';

export async function encrypt(plaintext: string): Promise<string> {
  try {
    const key = await deriveKey(PASSPHRASE);
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
  } catch (e) {
    console.error('Encryption failed:', e);
    // Fallback: store as-is with prefix
    return `plain:${plaintext}`;
  }
}

export async function decrypt(encoded: string): Promise<string> {
  try {
    // Handle unencrypted legacy values
    if (encoded.startsWith('plain:')) return encoded.slice(6);
    if (!encoded || encoded.length < 20) return encoded;

    const key = await deriveKey(PASSPHRASE);
    const combined = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed, returning raw value:', e);
    // If decryption fails, value was stored unencrypted
    return encoded;
  }
}
