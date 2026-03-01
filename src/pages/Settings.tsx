import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Header } from '../components/layout/Header';
import { Slack, Mail, Send, Key, CheckCircle2, XCircle, Loader2, Palette, Zap, Brain, Sparkles, RefreshCw, Kanban, Star, LogIn, HelpCircle, X, ChevronLeft, ChevronRight, ExternalLink, Check } from 'lucide-react';
import {
  getSetting, saveSetting,
} from '../lib/db';
import { tauriFetch } from '../lib/tauri-fetch';
import { encrypt, decrypt } from '../lib/crypto';
import { testConnection, getBoards, getBoardLists, type TrelloBoard, type TrelloList } from '../lib/trello-api';
import {
  saveTrelloCredentials, getTrelloCredentials,
  getSyncedBoardIds, saveSyncedBoardIds,
  syncAllBoards, startAutoSync, stopAutoSync, isAutoSyncRunning,
  pushQueuedLocalChanges, DEFAULT_SYNC_INTERVAL_MS,
  getWorkspaceInboxBridgeConfig,
  onSyncEvent, type SyncEvent,
} from '../lib/trello-sync';
import {
  buildOAuthUrl, addGmailAccount, removeGmailAccount,
  getGmailAccountList, type GmailAccountInfo,
} from '../lib/gmail-auth';
import { openExternal } from '../lib/open-url';

// ── Types ───────────────────────────────────────────
interface ChannelConfig {
  name: string; type: 'slack' | 'gmail' | 'telegram'; icon: typeof Slack; color: string;
  fields: { key: string; label: string; placeholder: string; type?: string; settingKey: string }[];
  status: 'disconnected' | 'testing' | 'connected' | 'error';
}

interface AIProvider {
  name: string; key: string; icon: typeof Key; color: string;
  fields: { key: string; label: string; placeholder: string; type?: string; settingKey: string }[];
  testFn?: () => Promise<TestResult>;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: string;
}

export function Settings() {
  // ── Channel state ─────────────────────────────────
  const [channels, setChannels] = useState<ChannelConfig[]>([
    {
      name: 'Slack', type: 'slack', icon: Slack, color: 'var(--slack)',
      fields: [
        { key: 'botToken', label: 'Bot Token', placeholder: 'xoxb-your-slack-bot-token', type: 'password', settingKey: 'slack_bot_token' },
      ],
      status: 'disconnected',
    },
    {
      name: 'Telegram', type: 'telegram', icon: Send, color: 'var(--telegram)',
      fields: [
        { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-your-bot-token', type: 'password', settingKey: 'telegram_bot_token' },
        { key: 'chatIds', label: 'Chat IDs', placeholder: '123456789, -100123456', settingKey: 'telegram_chat_ids' },
      ],
      status: 'disconnected',
    },
  ]);

  // ── AI state ──────────────────────────────────────
  const [aiData, setAiData] = useState<Record<string, Record<string, string>>>({
    openai: {}, google_ai: {}, glk5: {},
  });
  const [aiStatus, setAiStatus] = useState<Record<string, 'disconnected' | 'connected' | 'error'>>({
    openai: 'disconnected', google_ai: 'disconnected', glk5: 'disconnected',
  });
  const [activeProvider, setActiveProvider] = useState<string>('openai');

  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({ slack: {}, telegram: {} });
  const [saved, setSaved] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // ── AI Providers config ───────────────────────────
  const aiProviders: AIProvider[] = [
    {
      name: 'OpenAI', key: 'openai', icon: Key, color: '#10a37f',
      fields: [
        { key: 'apiKey', label: 'API Key', placeholder: 'sk-...', type: 'password', settingKey: 'openai_api_key' },
      ],
    },
    {
      name: 'Google AI', key: 'google_ai', icon: Sparkles, color: '#4285f4',
      fields: [
        { key: 'apiKey', label: 'API Key', placeholder: 'AIzaSy...', type: 'password', settingKey: 'google_ai_api_key' },
      ],
    },
    {
      name: 'GLK-5', key: 'glk5', icon: Brain, color: '#d97706',
      fields: [
        { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.z.ai/api/anthropic', settingKey: 'glk5_base_url' },
        { key: 'authToken', label: 'Auth Token', placeholder: 'your-auth-token', type: 'password', settingKey: 'glk5_auth_token' },
      ],
    },
  ];

  // ── Load settings on mount ────────────────────────
  useEffect(() => {
    async function loadSettings() {
      // Channels
      const data: Record<string, Record<string, string>> = { slack: {}, gmail: {}, telegram: {} };
      for (const channel of channels) {
        for (const field of channel.fields) {
          const val = await getSetting(field.settingKey);
          if (val) data[channel.type][field.key] = val;
        }
        const hasToken = Object.values(data[channel.type]).some(v => v.length > 0);
        if (hasToken) {
          setChannels(prev => prev.map(c => c.type === channel.type ? { ...c, status: 'connected' } : c));
        }
      }
      setFormData(data);

      // AI Providers
      const ai: Record<string, Record<string, string>> = { openai: {}, google_ai: {}, glk5: {} };
      const status: Record<string, 'disconnected' | 'connected' | 'error'> = { openai: 'disconnected', google_ai: 'disconnected', glk5: 'disconnected' };
      for (const provider of aiProviders) {
        for (const field of provider.fields) {
          const val = await getSetting(field.settingKey);
          if (val) ai[provider.key][field.key] = val;
        }
        const hasKey = Object.values(ai[provider.key]).some(v => v.length > 0);
        if (hasKey) status[provider.key] = 'connected';
      }
      setAiData(ai);
      setAiStatus(status);

      // Active provider
      const active = await getSetting('active_ai_provider');
      if (active) setActiveProvider(active);
    }
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────
  const updateField = (type: string, key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [type]: { ...prev[type], [key]: value } }));
  };

  const updateAiField = (providerKey: string, fieldKey: string, value: string) => {
    setAiData((prev) => ({ ...prev, [providerKey]: { ...prev[providerKey], [fieldKey]: value } }));
  };

  const showSaved = (name: string) => {
    setSaved(name);
    setTimeout(() => setSaved(null), 3000);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle2 size={14} style={{ color: 'var(--priority-low)' }} />;
      case 'error': return <XCircle size={14} style={{ color: 'var(--priority-urgent)' }} />;
      case 'testing': return <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />;
      default: return <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} />;
    }
  };

  const selectActiveProvider = async (providerKey: string) => {
    setActiveProvider(providerKey);
    await saveSetting('active_ai_provider', providerKey);
    showSaved(`${aiProviders.find(p => p.key === providerKey)?.name} set as active`);
  };

  // ── Save AI provider ──────────────────────────────
  const saveAiProvider = async (providerKey: string) => {
    const provider = aiProviders.find(p => p.key === providerKey);
    if (!provider) return;

    for (const field of provider.fields) {
      const value = aiData[providerKey]?.[field.key] || '';
      if (value) await saveSetting(field.settingKey, value);
    }

    const verifyKey = provider.fields[0].settingKey;
    const readBack = await getSetting(verifyKey);

    if (readBack) {
      setAiStatus(prev => ({ ...prev, [providerKey]: 'connected' }));
      showSaved(provider.name);
    } else {
      setAiStatus(prev => ({ ...prev, [providerKey]: 'error' }));
      setTestResult({ success: false, message: `❌ Failed to save ${provider.name}`, details: 'Database write failed.' });
    }
  };

  // ── Test AI providers ─────────────────────────────
  const testAiProvider = async (providerKey: string) => {
    setTestingProvider(providerKey);
    setTestResult(null);

    try {
      if (providerKey === 'openai') {
        const key = await getSetting('openai_api_key');
        if (!key) { setTestResult({ success: false, message: '❌ No OpenAI key saved' }); setTestingProvider(null); return; }
        const res = await tauriFetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${key}` },
        });
        const data = await res.json();
        if (data.data) {
          setTestResult({ success: true, message: `✅ OpenAI connected`, details: `${data.data.length} models available` });
          setAiStatus(prev => ({ ...prev, openai: 'connected' }));
        } else {
          setTestResult({ success: false, message: `❌ OpenAI error: ${data.error?.message || 'unknown'}` });
          setAiStatus(prev => ({ ...prev, openai: 'error' }));
        }
      }

      else if (providerKey === 'google_ai') {
        const key = await getSetting('google_ai_api_key');
        if (!key) { setTestResult({ success: false, message: '❌ No Google AI key saved' }); setTestingProvider(null); return; }
        const res = await tauriFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();
        if (data.models) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const names = data.models.slice(0, 3).map((m: any) => m.displayName || m.name).join(', ');
          setTestResult({ success: true, message: `✅ Google AI connected`, details: `${data.models.length} models: ${names}...` });
          setAiStatus(prev => ({ ...prev, google_ai: 'connected' }));
        } else {
          setTestResult({ success: false, message: `❌ Google AI error`, details: JSON.stringify(data.error || data, null, 2) });
          setAiStatus(prev => ({ ...prev, google_ai: 'error' }));
        }
      }

      else if (providerKey === 'glk5') {
        const baseUrl = await getSetting('glk5_base_url');
        const token = await getSetting('glk5_auth_token');
        if (!baseUrl || !token) { setTestResult({ success: false, message: '❌ No GLK-5 credentials saved' }); setTestingProvider(null); return; }

        const res = await tauriFetch(`${baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': token,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "hi" only' }],
          }),
        });
        const data = await res.json();
        if (data.content) {
          const reply = data.content[0]?.text || '';
          setTestResult({ success: true, message: `✅ GLK-5 connected`, details: `Model: ${data.model}\nResponse: "${reply}"` });
          setAiStatus(prev => ({ ...prev, glk5: 'connected' }));
        } else {
          setTestResult({ success: false, message: `❌ GLK-5 error`, details: JSON.stringify(data, null, 2) });
          setAiStatus(prev => ({ ...prev, glk5: 'error' }));
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setTestResult({ success: false, message: '❌ Network error', details: e.message || String(e) });
    }
    setTestingProvider(null);
  };

  // ── Save channel ──────────────────────────────────
  const saveChannel = async (type: string) => {
    const channel = channels.find(c => c.type === type);
    if (!channel) return;
    for (const field of channel.fields) {
      const value = formData[type]?.[field.key] || '';
      if (value) await saveSetting(field.settingKey, value);
    }
    const verifyKey = channel.fields[0].settingKey;
    const readBack = await getSetting(verifyKey);
    if (readBack) {
      setChannels(prev => prev.map(c => c.type === type ? { ...c, status: 'connected' } : c));
      showSaved(channel.name);
    } else {
      setChannels(prev => prev.map(c => c.type === type ? { ...c, status: 'error' } : c));
    }
  };

  // ── Test Slack ────────────────────────────────────
  const testSlackConnection = async () => {
    setTestingProvider('slack');
    setTestResult(null);
    try {
      const token = await getSetting('slack_bot_token');
      if (!token) { setTestResult({ success: false, message: '❌ No token saved' }); setTestingProvider(null); return; }
      const authRes = await tauriFetch('https://slack.com/api/auth.test', { headers: { 'Authorization': `Bearer ${token}` } });
      const authData = await authRes.json();
      if (!authData.ok) {
        setTestResult({ success: false, message: `❌ ${authData.error}`, details: JSON.stringify(authData, null, 2) });
      } else {
        const listRes = await tauriFetch(`https://slack.com/api/conversations.list?types=public_channel,private_channel,im&limit=10`, { headers: { 'Authorization': `Bearer ${token}` } });
        const listData = await listRes.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const memberCount = listData.channels?.filter((c: any) => c.is_member || c.is_im).length || 0;
        setTestResult({ success: true, message: `✅ "${authData.user}" on "${authData.team}"`, details: `Bot: ${authData.user_id}\nMember of: ${memberCount} channels` });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setTestResult({ success: false, message: '❌ Network error', details: e.message });
    }
    setTestingProvider(null);
  };

  // ── Render ────────────────────────────────────────
  return (
    <>
      <Header title="Settings" subtitle="Configure AI providers and channels" />
      <div className="page-content">
        {saved && (
          <div className="file-warning animate-fade-in" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', marginBottom: 16 }}>
            <CheckCircle2 size={14} /> {saved} ✓
          </div>
        )}

        {testResult && (
          <div className="file-analysis-card animate-fade-in" style={{ marginBottom: 16 }}>
            <div className="file-analysis-header">
              <div className="file-analysis-title"><Zap size={14} /><span>Test Result</span></div>
              <button className="btn-icon btn-ghost" onClick={() => setTestResult(null)}>✕</button>
            </div>
            <div className="file-analysis-body">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: testResult.success ? 'var(--green)' : 'var(--priority-urgent)' }}>
                {testResult.message}
              </div>
              {testResult.details && (
                <pre style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', margin: 0, padding: 8, background: 'var(--bg-surface)', borderRadius: 6 }}>
                  {testResult.details}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════
            AI PROVIDERS — 3 Cards in a Row
            ═══════════════════════════════════════════ */}
        <h3 className="settings-group-title">
          <Brain size={14} /> AI Providers
        </h3>

        <div className="settings-card-grid stagger">
          {aiProviders.map((provider) => {
            const isActive = activeProvider === provider.key;
            const status = aiStatus[provider.key];

            return (
              <div
                key={provider.key}
                className={`settings-card animate-fade-in ${isActive ? 'settings-card--active' : ''}`}
                style={isActive ? { '--card-accent': provider.color } as React.CSSProperties : undefined}
              >
                {/* Card Header */}
                <div className="settings-card-header">
                  <div className="settings-card-identity">
                    <div className="settings-card-icon" style={{ background: `${provider.color}18`, color: provider.color }}>
                      <provider.icon size={18} />
                    </div>
                    <div>
                      <div className="settings-card-name">{provider.name}</div>
                      <div className="settings-card-status">
                        {statusIcon(status)}
                        <span>{status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Radio Select — Active Provider */}
                  <button
                    className={`settings-card-select ${isActive ? 'active' : ''}`}
                    onClick={() => selectActiveProvider(provider.key)}
                    title={isActive ? 'Active provider' : 'Set as active'}
                  >
                    {isActive ? <Star size={14} fill="currentColor" /> : <Star size={14} />}
                  </button>
                </div>

                {/* Card Body — Fields */}
                <div className="settings-card-body">
                  {provider.fields.map((field) => (
                    <div key={field.key} className="settings-card-field">
                      <label className="settings-card-label">{field.label}</label>
                      <input
                        className="form-input"
                        type={field.type || 'text'}
                        placeholder={field.placeholder}
                        value={aiData[provider.key]?.[field.key] || ''}
                        onChange={(e) => updateAiField(provider.key, field.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* Card Footer — Actions */}
                <div className="settings-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => saveAiProvider(provider.key)}>
                    Save
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => testAiProvider(provider.key)}
                    disabled={testingProvider !== null}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  >
                    {testingProvider === provider.key
                      ? <><Loader2 size={12} className="spinning" /> Testing...</>
                      : <><Zap size={12} /> Test</>
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════
            MESSAGE CHANNELS — 3 Cards in a Row
            ═══════════════════════════════════════════ */}
        <h3 className="settings-group-title" style={{ marginTop: 32 }}>
          <Mail size={14} /> Message Channels
        </h3>

        <div className="settings-card-grid stagger">
          {channels.map((channel) => (
            <div key={channel.type} className="settings-card animate-fade-in">
              {/* Card Header */}
              <div className="settings-card-header">
                <div className="settings-card-identity">
                  <div className="settings-card-icon" style={{ background: `${channel.color}18`, color: channel.color }}>
                    <channel.icon size={18} />
                  </div>
                  <div>
                    <div className="settings-card-name">{channel.name}</div>
                    <div className="settings-card-status">
                      {statusIcon(channel.status)}
                      <span>{channel.status === 'connected' ? 'Connected' : channel.status === 'error' ? 'Error' : 'Not set'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body — Fields */}
              <div className="settings-card-body">
                {channel.fields.map((field) => (
                  <div key={field.key} className="settings-card-field">
                    <label className="settings-card-label">{field.label}</label>
                    <input
                      className="form-input"
                      type={field.type || 'text'}
                      placeholder={field.placeholder}
                      value={formData[channel.type]?.[field.key] || ''}
                      onChange={(e) => updateField(channel.type, field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Card Footer — Actions */}
              <div className="settings-card-actions">
                <button className="btn btn-primary btn-sm" onClick={() => saveChannel(channel.type)}>Save</button>
                {channel.type === 'slack' && (
                  <button
                    className="btn btn-sm"
                    onClick={testSlackConnection}
                    disabled={testingProvider !== null}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
                  >
                    {testingProvider === 'slack'
                      ? <><Loader2 size={12} className="spinning" /> Testing...</>
                      : <><Zap size={12} /> Test</>
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════
            OTHERS
            ═══════════════════════════════════════════ */}
        <h3 className="settings-group-title" style={{ marginTop: 32 }}>
          <Palette size={14} /> Others
        </h3>

        <TrelloSection />
        <GmailSettingsSection />

        <div className="settings-section animate-fade-in">
          <div className="flex items-center gap-3">
            <Palette size={20} style={{ color: '#a855f7' }} />
            <div>
              <div className="settings-section-title">Appearance</div>
              <div className="settings-section-desc" style={{ margin: 0 }}>Toggle theme in the sidebar</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════
   TRELLO SETTINGS SECTION
   ═══════════════════════════════════════════════ */

function TrelloSection() {
  const [apiKey, setApiKey] = useState('');
  const [token, setToken] = useState('');
  const [workspaceInboxBoardId, setWorkspaceInboxBoardId] = useState('');
  const [workspaceInboxListId, setWorkspaceInboxListId] = useState('');
  const [bridgeLists, setBridgeLists] = useState<TrelloList[]>([]);
  const [loadingBridgeLists, setLoadingBridgeLists] = useState(false);
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncEvent | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [bridgeHydrated, setBridgeHydrated] = useState(false);

  // Load saved credentials
  useEffect(() => {
    (async () => {
      const creds = await getTrelloCredentials();
      if (creds) {
        setApiKey(creds.key);
        setToken(creds.token);
        const result = await testConnection(creds.key, creds.token);
        if (result.ok) {
          setConnectedUser(result.user || null);
          const b = await getBoards(creds.key, creds.token);
          setBoards(b);
        }
      }
      const ids = await getSyncedBoardIds();
      setSelectedBoardIds(ids);
      const bridge = await getWorkspaceInboxBridgeConfig();
      if (bridge.boardId) setWorkspaceInboxBoardId(bridge.boardId);
      if (bridge.listId) setWorkspaceInboxListId(bridge.listId);
      if (creds && bridge.boardId) {
        try {
          const lists = await getBoardLists(bridge.boardId, creds.key, creds.token);
          setBridgeLists(lists);
        } catch {
          setBridgeLists([]);
        }
      }
      const ls = await getSetting('trello_last_sync');
      if (ls) setLastSync(ls);
      const autoSyncSaved = await getSetting('trello_auto_sync');
      const shouldAutoSync = autoSyncSaved === '1';
      if (shouldAutoSync && !isAutoSyncRunning()) {
        startAutoSync(DEFAULT_SYNC_INTERVAL_MS);
      }
      setAutoSync(shouldAutoSync || isAutoSyncRunning());
      setBridgeHydrated(true);
    })();
  }, []);

  // Auto-save credentials for Trello as user types (debounced)
  useEffect(() => {
    const trimmedKey = apiKey.trim();
    const trimmedToken = token.trim();
    if (!trimmedKey || !trimmedToken) return;
    const timer = window.setTimeout(() => {
      void saveTrelloCredentials(trimmedKey, trimmedToken);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [apiKey, token]);

  useEffect(() => {
    if (!workspaceInboxBoardId || !apiKey.trim() || !token.trim()) return;
    const timer = window.setTimeout(async () => {
      setLoadingBridgeLists(true);
      try {
        const lists = await getBoardLists(workspaceInboxBoardId, apiKey.trim(), token.trim());
        setBridgeLists(lists);
      } catch {
        setBridgeLists([]);
      }
      setLoadingBridgeLists(false);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [workspaceInboxBoardId, apiKey, token]);

  // Auto-save workspace inbox bridge config
  useEffect(() => {
    if (!bridgeHydrated) return;
    const timer = window.setTimeout(() => {
      void saveSetting('trello_workspace_inbox_board_id', workspaceInboxBoardId.trim());
      void saveSetting('trello_workspace_inbox_list_id', workspaceInboxListId.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [workspaceInboxBoardId, workspaceInboxListId, bridgeHydrated]);

  // Listen to sync events
  useEffect(() => {
    return onSyncEvent((event) => {
      setSyncStatus(event);
      if (event.lastSync) setLastSync(event.lastSync);
      setSyncing(event.status === 'syncing');
    });
  }, []);

  const handleTestConnection = useCallback(async () => {
    setTesting(true);
    try {
      await saveTrelloCredentials(apiKey, token);
      const result = await testConnection(apiKey, token);
      if (result.ok) {
        setConnectedUser(result.user || null);
        const b = await getBoards(apiKey, token);
        setBoards(b);
      } else {
        setConnectedUser(null);
        setBoards([]);
        alert(`Connection failed: ${result.error}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    setTesting(false);
  }, [apiKey, token]);

  const handleBoardToggle = useCallback(async (boardId: string) => {
    const newIds = selectedBoardIds.includes(boardId)
      ? selectedBoardIds.filter(id => id !== boardId)
      : [...selectedBoardIds, boardId];
    setSelectedBoardIds(newIds);
    await saveSyncedBoardIds(newIds);
  }, [selectedBoardIds]);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    try {
      const push = await pushQueuedLocalChanges();
      const result = await syncAllBoards();
      const now = new Date().toLocaleString('vi-VN');
      setSyncStatus({
        status: 'success',
        message: `Push ${push.pushed}/${push.processed}, Pull ${result.cards} cards từ ${result.boards} boards`,
        lastSync: now,
      });
      setLastSync(now);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setSyncStatus({ status: 'error', message: e.message });
    }
    setSyncing(false);
  }, []);

  const handleAutoSyncToggle = useCallback(() => {
    if (autoSync) {
      stopAutoSync();
      setAutoSync(false);
      void saveSetting('trello_auto_sync', '0');
    } else {
      startAutoSync(DEFAULT_SYNC_INTERVAL_MS);
      setAutoSync(true);
      void saveSetting('trello_auto_sync', '1');
    }
  }, [autoSync]);

  const inputStyle: React.CSSProperties = {
    padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
    fontFamily: 'inherit', width: '100%',
  };
  const hasSyncTarget = selectedBoardIds.length > 0 || (!!workspaceInboxBoardId.trim() && !!workspaceInboxListId.trim());

  return (
    <div className="settings-section animate-fade-in">
      <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
        <Kanban size={20} style={{ color: '#0079BF' }} />
        <div>
          <div className="settings-section-title">Trello Integration</div>
          <div className="settings-section-desc" style={{ margin: 0 }}>Bi-directional sync: push local changes + pull Trello updates</div>
        </div>
        {connectedUser && (
          <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', background: '#0079BF', color: 'white', padding: '0.2rem 0.6rem', borderRadius: 9999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> {connectedUser}
          </span>
        )}
      </div>

      {/* Credentials */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>API Key</label>
          <input type="text" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="302d776985..." style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>Token</label>
          <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ATTA7226d1..." style={inputStyle} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className="btn btn-sm" onClick={handleTestConnection} disabled={testing || !apiKey || !token}
          style={{ background: '#0079BF', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
          {testing ? <><Loader2 size={12} className="spinning" /> Testing...</> : <><Zap size={12} /> Test Connection</>}
        </button>
      </div>

      {/* Board Picker */}
      {boards.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Boards to sync</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {boards.map(b => (
              <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: 'var(--text-sm)', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius-sm)', background: selectedBoardIds.includes(b.id) ? '#0079BF15' : 'transparent', border: selectedBoardIds.includes(b.id) ? '1px solid #0079BF40' : '1px solid transparent' }}>
                <input type="checkbox" checked={selectedBoardIds.includes(b.id)} onChange={() => handleBoardToggle(b.id)} />
                <span style={{ fontWeight: selectedBoardIds.includes(b.id) ? 600 : 400 }}>{b.name}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {b.dateLastActivity ? new Date(b.dateLastActivity).toLocaleDateString('vi-VN') : ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Workspace Inbox Bridge */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
          Workspace Inbox Bridge (optional)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>Bridge Board</label>
            <select
              value={workspaceInboxBoardId}
              onChange={(e) => {
                setWorkspaceInboxBoardId(e.target.value);
                setWorkspaceInboxListId('');
              }}
              style={inputStyle}
            >
              <option value="">-- Select board --</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {workspaceInboxBoardId && (
              <div style={{ marginTop: 4, fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                Board ID: <code>{workspaceInboxBoardId}</code>
              </div>
            )}
          </div>
          <div>
            <label style={{ fontSize: 'var(--text-xs)', fontWeight: 500, marginBottom: '0.3rem', display: 'block' }}>Inbox List</label>
            <select
              value={workspaceInboxListId}
              onChange={(e) => setWorkspaceInboxListId(e.target.value)}
              style={inputStyle}
              disabled={!workspaceInboxBoardId || loadingBridgeLists}
            >
              <option value="">
                {loadingBridgeLists ? '-- Loading lists... --' : '-- Select list --'}
              </option>
              {bridgeLists.map((list) => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
            {workspaceInboxListId && (
              <div style={{ marginTop: 4, fontSize: 'var(--text-2xs)', color: 'var(--text-muted)' }}>
                List ID: <code>{workspaceInboxListId}</code>
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: '0.35rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Chọn board và list từ dropdown để app tự lấy ID. Hệ thống sẽ pull riêng list này như Workspace Inbox.
        </div>
      </div>

      {/* Sync Controls */}
      {hasSyncTarget && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleSyncNow} disabled={syncing}
            style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            {syncing ? <><Loader2 size={12} className="spinning" /> Syncing...</> : <><RefreshCw size={12} /> Sync Now</>}
          </button>
          <button onClick={handleAutoSyncToggle}
            style={{ background: autoSync ? '#22c55e' : 'var(--bg-surface)', color: autoSync ? 'white' : 'var(--text-primary)', border: `1px solid ${autoSync ? '#22c55e' : 'var(--border)'}`, padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {autoSync ? '● Auto-sync ON (2 min)' : '○ Auto-sync OFF'}
          </button>
          {lastSync && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Last sync: {lastSync}
            </span>
          )}
          {syncStatus && syncStatus.status !== 'syncing' && (
            <span style={{ fontSize: 'var(--text-xs)', color: syncStatus.status === 'success' ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
              {syncStatus.status === 'success' ? '✓' : '✗'} {syncStatus.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GMAIL SETTINGS SECTION
   ═══════════════════════════════════════════════ */

function GmailSettingsSection() {
  const [accounts, setAccounts] = useState<GmailAccountInfo[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [addStep, setAddStep] = useState<'credentials' | 'auth_code'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const loadAccounts = async () => {
    const list = await getGmailAccountList();
    setAccounts(list);
  };

  const loadSavedOauthCredentials = async () => {
    const savedClientId = await getSetting('gmail_oauth_client_id');
    let savedClientSecret = '';
    const savedClientSecretEnc = await getSetting('gmail_oauth_client_secret_enc');
    if (savedClientSecretEnc) {
      savedClientSecret = await decrypt(savedClientSecretEnc);
    } else {
      // Backward-compatible migration path from old plain setting key
      const oldPlainSecret = await getSetting('gmail_oauth_client_secret');
      if (oldPlainSecret) {
        savedClientSecret = oldPlainSecret;
        await saveSetting('gmail_oauth_client_secret_enc', await encrypt(oldPlainSecret));
      }
    }
    if (savedClientId) setClientId(savedClientId);
    if (savedClientSecret) setClientSecret(savedClientSecret);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAccounts();
      void loadSavedOauthCredentials();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleStartOAuth = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Vui lòng nhập Client ID và Client Secret');
      return;
    }
    await saveSetting('gmail_oauth_client_id', clientId.trim());
    await saveSetting('gmail_oauth_client_secret_enc', await encrypt(clientSecret.trim()));
    const url = buildOAuthUrl(clientId.trim());
    openExternal(url);
    setAddStep('auth_code');
    setError('');
  };

  const handleConnect = async () => {
    if (!authCode.trim()) return;
    setLoading(true);
    setError('');
    const result = await addGmailAccount(clientId.trim(), clientSecret.trim(), authCode.trim());
    if (result.success) {
      await loadAccounts();
      setShowAddForm(false);
      setAddStep('credentials');
      setAuthCode('');
    } else {
      setError(result.error || 'Không thể kết nối');
    }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    await removeGmailAccount(id);
    await loadAccounts();
  };

  return (
    <div className="settings-section animate-fade-in" style={{ marginTop: 12 }}>
      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-identity">
            <div className="settings-card-icon" style={{ background: 'rgba(234,67,53,0.12)', color: '#ea4335' }}>
              <Mail size={18} />
            </div>
            <div>
              <div className="settings-card-name">Gmail Integration</div>
              <div className="settings-card-status">
                {accounts.length > 0 ? (
                  <><CheckCircle2 size={10} style={{ color: '#22c55e' }} /> <span>{accounts.length} tài khoản</span></>
                ) : (
                  <><XCircle size={10} style={{ color: 'var(--text-muted)' }} /> <span>Chưa kết nối</span></>
                )}
              </div>
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => setShowGuide(true)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <HelpCircle size={12} /> Hướng dẫn
          </button>
        </div>

        <div className="settings-card-body">
          {/* ── Account List ── */}
          {accounts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {accounts.map(acc => (
                <div key={acc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: acc.photo ? 'none' : `${acc.color}18`,
                    border: `2px solid ${acc.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                  }}>
                    {acc.photo ? (
                      <img src={acc.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: acc.color }}>
                        {acc.email.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {acc.name && <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</div>}
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</div>
                  </div>
                  <button onClick={() => handleRemove(acc.id)} title="Disconnect"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'flex' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Add Account Form ── */}
          {showAddForm ? (
            <div style={{ padding: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              {addStep === 'credentials' ? (
                <>
                  <div className="settings-card-field">
                    <label className="settings-card-label">Client ID</label>
                    <input className="form-input" value={clientId} onChange={e => setClientId(e.target.value)} placeholder="xxx.apps.googleusercontent.com" />
                  </div>
                  <div className="settings-card-field" style={{ marginTop: 8 }}>
                    <label className="settings-card-label">Client Secret</label>
                    <input className="form-input" type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="GOCSPX-..." />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                    Copy mã xác thực từ trình duyệt và paste vào đây:
                  </div>
                  <div className="settings-card-field">
                    <label className="settings-card-label">Authorization Code</label>
                    <input className="form-input" value={authCode} onChange={e => setAuthCode(e.target.value)}
                      placeholder="4/0Axx..." onKeyDown={e => e.key === 'Enter' && handleConnect()} />
                  </div>
                </>
              )}

              {error && <div style={{ fontSize: 'var(--text-xs)', color: '#ef4444', marginTop: 6 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                {addStep === 'credentials' ? (
                  <button className="btn btn-primary btn-sm" onClick={handleStartOAuth} disabled={!clientId.trim() || !clientSecret.trim()}>
                    <LogIn size={12} /> Đăng nhập Google
                  </button>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={handleConnect} disabled={loading || !authCode.trim()}>
                    {loading ? <><Loader2 size={12} className="spinning" /> Connecting...</> : <>Connect</>}
                  </button>
                )}
                <button className="btn btn-sm" onClick={() => { setShowAddForm(false); setAddStep('credentials'); setError(''); }}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  Huỷ
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-sm" onClick={() => setShowAddForm(true)}
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mail size={12} /> Thêm tài khoản Gmail
            </button>
          )}
        </div>
      </div>
      <GmailSetupGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   GMAIL SETUP GUIDE — Step-by-Step Wizard
   ═══════════════════════════════════════════════ */



const SETUP_STEPS = [
  {
    title: '1. Mở Google Cloud Console',
    content: `Truy cập Google Cloud Console — đây là nơi bạn quản lý API và project của Google.`,
    tip: 'Đăng nhập bằng tài khoản Gmail mà bạn muốn kết nối.',
    link: { url: 'https://console.cloud.google.com/', label: 'Mở Google Cloud Console' },
    details: [
      'Nếu chưa có tài khoản Google Cloud, bạn sẽ được yêu cầu chấp nhận điều khoản sử dụng.',
      'Không cần nhập thẻ tín dụng — Gmail API miễn phí cho sử dụng cá nhân.',
    ],
  },
  {
    title: '2. Tạo Project mới',
    content: `Tạo một project để chứa các API credentials.`,
    tip: 'Đặt tên project dễ nhớ, ví dụ: "Nexus Hub Gmail".',
    link: { url: 'https://console.cloud.google.com/projectcreate', label: 'Tạo Project mới' },
    details: [
      'Bấm vào dropdown project ở góc trên bên trái → "New Project".',
      'Nhập tên project (ví dụ: Nexus Hub Gmail).',
      'Để mặc định Organization → Bấm "Create".',
      'Đợi khoảng 10-20 giây để project được tạo.',
      'Chọn project vừa tạo từ dropdown.',
    ],
  },
  {
    title: '3. Bật Gmail API',
    content: `Bật Gmail API để cho phép ứng dụng đọc email của bạn.`,
    tip: 'Bấm "Enable" — chỉ cần 1 click.',
    link: { url: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com', label: 'Mở Gmail API' },
    details: [
      'Tìm kiếm "Gmail API" trong API Library.',
      'Bấm vào kết quả "Gmail API" của Google.',
      'Bấm nút "Enable" (màu xanh dương).',
      'Đợi vài giây để API được kích hoạt.',
    ],
  },
  {
    title: '4. Cấu hình OAuth Consent Screen',
    content: `Cấu hình màn hình xác nhận quyền — bước bắt buộc trước khi tạo credentials.`,
    tip: 'Chọn "External" để test. Bạn sẽ thêm email của mình vào danh sách Test users.',
    link: { url: 'https://console.cloud.google.com/apis/credentials/consent', label: 'Cấu hình Consent Screen' },
    details: [
      'Chọn User Type: "External" → Bấm "Create".',
      'App name: nhập tên bất kỳ (ví dụ: Nexus Hub).',
      'User support email: chọn email của bạn.',
      'Developer contact: nhập email của bạn.',
      'Bấm "Save and Continue" qua các bước Scopes và Test Users.',
      'Ở bước Test Users: bấm "Add Users" → nhập email Google của bạn.',
      'Bấm "Save and Continue" → "Back to Dashboard".',
    ],
  },
  {
    title: '5. Tạo OAuth Client ID',
    content: `Tạo credentials để Nexus Hub có thể kết nối với Gmail của bạn.`,
    tip: 'Chọn Application type: "Desktop app".',
    link: { url: 'https://console.cloud.google.com/apis/credentials/oauthclient', label: 'Tạo OAuth Credentials' },
    details: [
      'Vào Credentials → Bấm "+ Create Credentials" → chọn "OAuth Client ID".',
      'Application type: chọn "Desktop app".',
      'Name: nhập tên bất kỳ (ví dụ: Nexus Hub Desktop).',
      'Bấm "Create".',
      'Một popup hiện ra hiển thị Client ID và Client Secret.',
    ],
  },
  {
    title: '6. Copy Client ID & Secret',
    content: `Sao chép Client ID và Client Secret từ popup vừa tạo, dán vào 2 ô bên trái.`,
    tip: 'Sau khi paste xong, bấm "Sign in with Google" để hoàn tất!',
    link: null,
    details: [
      'Copy giá trị "Client ID" → paste vào ô Client ID bên trái.',
      'Copy giá trị "Client Secret" → paste vào ô Client Secret bên trái.',
      'Đóng panel hướng dẫn này.',
      'Bấm "Sign in with Google" để bắt đầu kết nối!',
    ],
  },
];

function GmailSetupGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = SETUP_STEPS[currentStep];

  if (!open) return null;

  return createPortal(
    <>
      <div className="setup-guide-backdrop" onClick={onClose} />
      <div className="setup-guide-drawer">
        {/* Header */}
        <div className="setup-guide-header">
          <div>
            <div className="setup-guide-title">Hướng dẫn kết nối Gmail</div>
            <div className="setup-guide-subtitle">Bước {currentStep + 1} / {SETUP_STEPS.length}</div>
          </div>
          <button className="card-drawer-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Progress Bar */}
        <div className="setup-guide-progress">
          {SETUP_STEPS.map((_, i) => (
            <div
              key={i}
              className={`setup-guide-progress-dot ${i === currentStep ? 'active' : i < currentStep ? 'done' : ''}`}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="setup-guide-body">
          <h3 className="setup-guide-step-title">{step.title}</h3>
          <p className="setup-guide-step-desc">{step.content}</p>

          {step.link && (
            <button
              type="button"
              className="setup-guide-link"
              onClick={() => openExternal(step.link!.url)}
            >
              <ExternalLink size={13} /> {step.link.label}
            </button>
          )}

          <div className="setup-guide-details">
            {step.details.map((d, i) => (
              <div key={i} className="setup-guide-detail-item">
                <span className="setup-guide-detail-num">{i + 1}</span>
                <span>{d}</span>
              </div>
            ))}
          </div>

          {step.tip && (
            <div className="setup-guide-tip">
              💡 <strong>Mẹo:</strong> {step.tip}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="setup-guide-footer">
          <button
            className="btn btn-sm"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft size={14} /> Quay lại
          </button>

          {currentStep < SETUP_STEPS.length - 1 ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setCurrentStep(prev => prev + 1)}
            >
              Tiếp theo <ChevronRight size={14} />
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              <Check size={14} /> Hoàn tất
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
