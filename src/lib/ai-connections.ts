import { getSetting, saveSetting } from './db';

// ── Types ──────────────────────────────────────────
export interface AIConnection {
    id: string;
    provider: string;   // 'openai' | 'google_ai' | 'glk5'
    name: string;       // user label
    apiKey: string;
    baseUrl?: string;    // optional override
    isActive: boolean;
    status: 'connected' | 'error' | 'disconnected';
    createdAt: string;
}

const STORAGE_KEY = 'ai_connections';

// ── Helpers ────────────────────────────────────────
function genId(): string {
    return crypto.randomUUID?.() || `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── CRUD ──────────────────────────────────────────
export async function getConnections(): Promise<AIConnection[]> {
    const raw = await getSetting(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
}

async function saveConnections(conns: AIConnection[]): Promise<void> {
    await saveSetting(STORAGE_KEY, JSON.stringify(conns));
}

export async function addConnection(conn: Omit<AIConnection, 'id' | 'createdAt'>): Promise<AIConnection> {
    const conns = await getConnections();
    const newConn: AIConnection = {
        ...conn,
        id: genId(),
        createdAt: new Date().toISOString(),
    };

    // If this is the first connection for this provider, set as active
    const sameProvider = conns.filter(c => c.provider === conn.provider);
    if (sameProvider.length === 0) {
        newConn.isActive = true;
    }

    // If setting as active, deactivate others of same provider
    if (newConn.isActive) {
        conns.forEach(c => {
            if (c.provider === conn.provider) c.isActive = false;
        });
    }

    conns.push(newConn);
    await saveConnections(conns);
    return newConn;
}

export async function updateConnection(id: string, updates: Partial<AIConnection>): Promise<void> {
    const conns = await getConnections();
    const idx = conns.findIndex(c => c.id === id);
    if (idx < 0) return;

    // If setting as active, deactivate others of same provider
    if (updates.isActive) {
        const provider = conns[idx].provider;
        conns.forEach(c => {
            if (c.provider === provider) c.isActive = false;
        });
    }

    conns[idx] = { ...conns[idx], ...updates };
    await saveConnections(conns);
}

export async function removeConnection(id: string): Promise<void> {
    let conns = await getConnections();
    const removed = conns.find(c => c.id === id);
    conns = conns.filter(c => c.id !== id);

    // If removed was active, activate the next one of same provider
    if (removed?.isActive) {
        const sameProvider = conns.filter(c => c.provider === removed.provider);
        if (sameProvider.length > 0) {
            sameProvider[0].isActive = true;
        }
    }

    await saveConnections(conns);
}

export async function setActiveConnection(id: string): Promise<void> {
    const conns = await getConnections();
    const target = conns.find(c => c.id === id);
    if (!target) return;

    conns.forEach(c => {
        if (c.provider === target.provider) {
            c.isActive = c.id === id;
        }
    });

    await saveConnections(conns);
}

// ── Get active connection for a provider ──────────
export async function getActiveConnection(provider: string): Promise<AIConnection | null> {
    const conns = await getConnections();
    return conns.find(c => c.provider === provider && c.isActive) || null;
}

// ── Get active API key for a provider (convenience) ──
export async function getActiveApiKey(provider: string): Promise<string | null> {
    const conn = await getActiveConnection(provider);
    return conn?.apiKey || null;
}

// ── Migration: move legacy single-key settings to connections ──
export async function migrateLegacyKeys(): Promise<void> {
    const conns = await getConnections();
    if (conns.length > 0) return; // Already migrated

    const newConns: AIConnection[] = [];

    // OpenAI
    const openaiKey = await getSetting('openai_api_key');
    if (openaiKey) {
        newConns.push({
            id: genId(), provider: 'openai', name: 'Default',
            apiKey: openaiKey, isActive: true, status: 'connected',
            createdAt: new Date().toISOString(),
        });
    }

    // Google AI
    const googleKey = await getSetting('google_ai_api_key');
    if (googleKey) {
        newConns.push({
            id: genId(), provider: 'google_ai', name: 'Default',
            apiKey: googleKey, isActive: true, status: 'connected',
            createdAt: new Date().toISOString(),
        });
    }

    // GLK-5 (new format)
    const glk5Key = await getSetting('glk5_api_key');
    if (glk5Key) {
        newConns.push({
            id: genId(), provider: 'glk5', name: 'Default',
            apiKey: glk5Key, isActive: true, status: 'connected',
            createdAt: new Date().toISOString(),
        });
    }
    // GLK-5 (legacy format)
    const glk5Token = await getSetting('glk5_auth_token');
    if (glk5Token && !glk5Key) {
        newConns.push({
            id: genId(), provider: 'glk5', name: 'Default (Legacy)',
            apiKey: glk5Token, isActive: true, status: 'connected',
            createdAt: new Date().toISOString(),
        });
    }

    if (newConns.length > 0) {
        await saveConnections(newConns);
    }
}
