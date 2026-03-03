// ── Onboarding Storage Abstraction ─────────────────────────────────────────
// Provides onboarding state storage with tauri-plugin-store fallback to localStorage.
// Tracks whether user has completed the welcome overlay.

export interface OnboardingStatus {
  completed: boolean;
  completedAt?: string;
}

const ONBOARDING_KEY = 'nexus_onboarding_completed';
const STORE_PATH = 'onboarding.json';

let _store: any | null = null;
let _storeLoaded = false;

// Lazy load tauri-plugin-store (v2 uses static factory method)
async function getStore() {
  if (_storeLoaded) return _store;
  try {
    const { Store } = await import('@tauri-apps/plugin-store');
    _store = await Store.load(STORE_PATH);
    _storeLoaded = true;
    return _store;
  } catch {
    // Not in Tauri environment, use localStorage
    _store = null;
    _storeLoaded = true;
    return null;
  }
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const store = await getStore();
  if (store) {
    const status = await store.get(ONBOARDING_KEY) as OnboardingStatus | null;
    return status ?? { completed: false };
  }
  const statusStr = localStorage.getItem(ONBOARDING_KEY);
  if (!statusStr) return { completed: false };
  try {
    return JSON.parse(statusStr);
  } catch {
    return { completed: false };
  }
}

export async function setOnboardingCompleted(): Promise<void> {
  const status: OnboardingStatus = {
    completed: true,
    completedAt: new Date().toISOString(),
  };
  const store = await getStore();
  if (store) {
    await store.set(ONBOARDING_KEY, status);
    await store.save();
  } else {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(status));
  }
}
