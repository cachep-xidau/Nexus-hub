// ── Token Storage Abstraction ─────────────────────────────────────────────
// Provides token storage with tauri-plugin-store fallback to localStorage.
// This allows the same code to work in Tauri (secure storage) and browser dev.

const TOKEN_KEY = 'nexus_auth_token';
const USER_KEY = 'nexus_auth_user';
const STORE_PATH = 'auth.json';

interface StoreAdapter {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  save(): Promise<void>;
}

export interface StoredAuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

let _store: StoreAdapter | null = null;
let _storeLoaded = false;

// Lazy load tauri-plugin-store (v2 uses static factory method)
async function getStore() {
  if (_storeLoaded) return _store;
  try {
    const { Store } = await import('@tauri-apps/plugin-store');
    _store = await Store.load(STORE_PATH) as StoreAdapter;
    _storeLoaded = true;
    return _store;
  } catch {
    // Not in Tauri environment, use localStorage
    _store = null;
    _storeLoaded = true;
    return null;
  }
}

export async function getToken(): Promise<string | null> {
  const store = await getStore();
  if (store) {
    return await store.get(TOKEN_KEY) as string | null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  const store = await getStore();
  if (store) {
    await store.set(TOKEN_KEY, token);
    await store.save();
  } else {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  const store = await getStore();
  if (store) {
    await store.delete(TOKEN_KEY);
    await store.save();
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function getUser(): Promise<StoredAuthUser | null> {
  const store = await getStore();
  if (store) {
    return await store.get<StoredAuthUser>(USER_KEY);
  }
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as StoredAuthUser;
  } catch {
    console.warn('[TokenStorage] Corrupt user data in localStorage, clearing');
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export async function setUser(user: StoredAuthUser): Promise<void> {
  const store = await getStore();
  if (store) {
    await store.set(USER_KEY, user);
    await store.save();
  } else {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export async function clearUser(): Promise<void> {
  const store = await getStore();
  if (store) {
    await store.delete(USER_KEY);
    await store.save();
  } else {
    localStorage.removeItem(USER_KEY);
  }
}
