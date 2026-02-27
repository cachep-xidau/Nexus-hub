import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { Slack, Mail, Send, Key, CheckCircle2, XCircle, Loader2, Palette, Zap, Brain, Sparkles, RefreshCw, Kanban } from 'lucide-react';
import { getSetting, saveSetting } from '../lib/db';
import { tauriFetch } from '../lib/tauri-fetch';
import { testConnection, getBoards, type TrelloBoard } from '../lib/trello-api';
import {
  getTrelloCredentials, saveTrelloCredentials,
  getSyncedBoardIds, saveSyncedBoardIds,
  syncAllBoards, startAutoSync, stopAutoSync, isAutoSyncRunning,
  onSyncEvent, type SyncEvent,
} from '../lib/trello-sync';

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
      name: 'Gmail', type: 'gmail', icon: Mail, color: 'var(--gmail)',
      fields: [
        { key: 'clientId', label: 'Client ID', placeholder: 'your-client-id.apps.googleusercontent.com', settingKey: 'gmail_client_id' },
        { key: 'clientSecret', label: 'Client Secret', placeholder: 'your-client-secret', type: 'password', settingKey: 'gmail_client_secret' },
        { key: 'refreshToken', label: 'Refresh Token', placeholder: 'your-refresh-token', type: 'password', settingKey: 'gmail_refresh_token' },
        { key: 'email', label: 'Email Address', placeholder: 'you@gmail.com', settingKey: 'gmail_email' },
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

  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({ slack: {}, gmail: {}, telegram: {} });
  const [saved, setSaved] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);

  // ── AI Providers config ───────────────────────────
  const aiProviders: AIProvider[] = [
    {
      name: 'OpenAI', key: 'openai', icon: Key, color: '#10a37f',
      fields: [
        { key: 'apiKey', label: 'API Key', placeholder: 'sk-...', type: 'password', settingKey: 'openai_api_key' },
      ],
    },
    {
      name: 'Google AI (Gemini)', key: 'google_ai', icon: Sparkles, color: '#4285f4',
      fields: [
        { key: 'apiKey', label: 'API Key', placeholder: 'AIzaSy...', type: 'password', settingKey: 'google_ai_api_key' },
      ],
    },
    {
      name: 'GLK-5 (Anthropic)', key: 'glk5', icon: Brain, color: '#d97706',
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
      case 'connected': return <CheckCircle2 size={16} style={{ color: 'var(--priority-low)' }} />;
      case 'error': return <XCircle size={16} style={{ color: 'var(--priority-urgent)' }} />;
      case 'testing': return <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />;
      default: return <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)' }} />;
    }
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
    setTesting(true);
    setTestResult(null);

    try {
      if (providerKey === 'openai') {
        const key = await getSetting('openai_api_key');
        if (!key) { setTestResult({ success: false, message: '❌ No OpenAI key saved' }); setTesting(false); return; }
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
        if (!key) { setTestResult({ success: false, message: '❌ No Google AI key saved' }); setTesting(false); return; }
        const res = await tauriFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();
        if (data.models) {
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
        if (!baseUrl || !token) { setTestResult({ success: false, message: '❌ No GLK-5 credentials saved' }); setTesting(false); return; }

        // Test with a minimal messages request
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
    } catch (e: any) {
      setTestResult({ success: false, message: '❌ Network error', details: e.message || String(e) });
    }
    setTesting(false);
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
    setTesting(true);
    setTestResult(null);
    try {
      const token = await getSetting('slack_bot_token');
      if (!token) { setTestResult({ success: false, message: '❌ No token saved' }); setTesting(false); return; }
      const authRes = await tauriFetch('https://slack.com/api/auth.test', { headers: { 'Authorization': `Bearer ${token}` } });
      const authData = await authRes.json();
      if (!authData.ok) {
        setTestResult({ success: false, message: `❌ ${authData.error}`, details: JSON.stringify(authData, null, 2) });
      } else {
        const listRes = await tauriFetch(`https://slack.com/api/conversations.list?types=public_channel,private_channel,im&limit=10`, { headers: { 'Authorization': `Bearer ${token}` } });
        const listData = await listRes.json();
        const memberCount = listData.channels?.filter((c: any) => c.is_member || c.is_im).length || 0;
        setTestResult({ success: true, message: `✅ "${authData.user}" on "${authData.team}"`, details: `Bot: ${authData.user_id}\nMember of: ${memberCount} channels` });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: '❌ Network error', details: e.message });
    }
    setTesting(false);
  };

  // ── Render ────────────────────────────────────────
  return (
    <>
      <Header title="Settings" subtitle="Configure AI providers and channels" />
      <div className="page-content" style={{ maxWidth: 720 }}>
        {saved && (
          <div className="file-warning animate-fade-in" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--green)', marginBottom: 16 }}>
            <CheckCircle2 size={14} /> {saved} saved ✓
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

        {/* ── AI Providers ──────────────────────────── */}
        <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', margin: '0 0 12px', fontWeight: 600 }}>
          AI Providers
        </h3>

        {aiProviders.map((provider) => (
          <div key={provider.key} className="settings-section animate-fade-in">
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="flex items-center gap-3">
                <provider.icon size={20} style={{ color: provider.color }} />
                <div>
                  <div className="settings-section-title">{provider.name}</div>
                  <div className="settings-section-desc" style={{ margin: 0 }}>
                    {aiStatus[provider.key] === 'connected' ? 'Configured' : 'Not configured'}
                  </div>
                </div>
              </div>
              {statusIcon(aiStatus[provider.key])}
            </div>
            {provider.fields.map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input
                  className="form-input"
                  type={field.type || 'text'}
                  placeholder={field.placeholder}
                  value={aiData[provider.key]?.[field.key] || ''}
                  onChange={(e) => updateAiField(provider.key, field.key, e.target.value)}
                />
              </div>
            ))}
            <div className="flex gap-2" style={{ gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => saveAiProvider(provider.key)}>
                Save
              </button>
              <button
                className="btn btn-sm"
                onClick={() => testAiProvider(provider.key)}
                disabled={testing}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                {testing ? <><Loader2 size={12} className="spinning" /> Testing...</> : <><Zap size={12} /> Test</>}
              </button>
            </div>
          </div>
        ))}

        {/* ── Message Channels ─────────────────────── */}
        <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', margin: '24px 0 12px', fontWeight: 600 }}>
          Message Channels
        </h3>

        {channels.map((channel) => (
          <div key={channel.type} className="settings-section animate-fade-in">
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <div className="flex items-center gap-3">
                <channel.icon size={20} style={{ color: channel.color }} />
                <div>
                  <div className="settings-section-title">{channel.name}</div>
                  <div className="settings-section-desc" style={{ margin: 0 }}>
                    {channel.status === 'connected' ? 'Connected' : channel.status === 'error' ? 'Error' : 'Not configured'}
                  </div>
                </div>
              </div>
              {statusIcon(channel.status)}
            </div>
            {channel.fields.map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input className="form-input" type={field.type || 'text'} placeholder={field.placeholder}
                  value={formData[channel.type]?.[field.key] || ''} onChange={(e) => updateField(channel.type, field.key, e.target.value)} />
              </div>
            ))}
            <div className="flex gap-2" style={{ gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => saveChannel(channel.type)}>Save</button>
              {channel.type === 'slack' && (
                <button className="btn btn-sm" onClick={testSlackConnection} disabled={testing}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  {testing ? <><Loader2 size={12} className="spinning" /> Testing...</> : <><Zap size={12} /> Test</>}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* ── Trello Integration ──────────────────── */}
        <TrelloSection />

        {/* ── Appearance ───────────────────────────── */}
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
  const [connectedUser, setConnectedUser] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [boards, setBoards] = useState<TrelloBoard[]>([]);
  const [selectedBoardIds, setSelectedBoardIds] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncEvent | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Load saved credentials
  useEffect(() => {
    (async () => {
      const creds = await getTrelloCredentials();
      if (creds) {
        setApiKey(creds.key);
        setToken(creds.token);
        // Auto-test if credentials exist
        const result = await testConnection(creds.key, creds.token);
        if (result.ok) {
          setConnectedUser(result.user || null);
          const b = await getBoards(creds.key, creds.token);
          setBoards(b);
        }
      }
      const ids = await getSyncedBoardIds();
      setSelectedBoardIds(ids);
      const ls = await getSetting('trello_last_sync');
      if (ls) setLastSync(ls);
      setAutoSync(isAutoSyncRunning());
    })();
  }, []);

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
      const result = await syncAllBoards();
      const now = new Date().toLocaleString('vi-VN');
      setSyncStatus({ status: 'success', message: `Đồng bộ ${result.cards} cards từ ${result.boards} boards`, lastSync: now });
      setLastSync(now);
    } catch (e: any) {
      setSyncStatus({ status: 'error', message: e.message });
    }
    setSyncing(false);
  }, []);

  const handleAutoSyncToggle = useCallback(() => {
    if (autoSync) {
      stopAutoSync();
      setAutoSync(false);
    } else {
      startAutoSync(300_000); // 5 min
      setAutoSync(true);
    }
  }, [autoSync]);

  const inputStyle: React.CSSProperties = {
    padding: '0.45rem 0.75rem', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
    fontFamily: 'inherit', width: '100%',
  };

  return (
    <div className="settings-section animate-fade-in">
      <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
        <Kanban size={20} style={{ color: '#0079BF' }} />
        <div>
          <div className="settings-section-title">Trello Integration</div>
          <div className="settings-section-desc" style={{ margin: 0 }}>Sync kanban boards from Trello (one-way)</div>
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

      {/* Sync Controls */}
      {selectedBoardIds.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleSyncNow} disabled={syncing}
            style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: syncing ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
            {syncing ? <><Loader2 size={12} className="spinning" /> Syncing...</> : <><RefreshCw size={12} /> Sync Now</>}
          </button>
          <button onClick={handleAutoSyncToggle}
            style={{ background: autoSync ? '#22c55e' : 'var(--bg-surface)', color: autoSync ? 'white' : 'var(--text-primary)', border: `1px solid ${autoSync ? '#22c55e' : 'var(--border)'}`, padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {autoSync ? '● Auto-sync ON (5 min)' : '○ Auto-sync OFF'}
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
