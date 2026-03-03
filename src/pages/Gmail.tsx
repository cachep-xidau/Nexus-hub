import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { Mail, RefreshCw, Clock, ChevronDown, ChevronUp, Search, Paperclip } from 'lucide-react';
import { getGmailEmails, saveGmailEmails, type GmailEmail } from '../lib/db';
import { isGmailConnected, getGmailAccountList, refreshAccountToken, type GmailAccountInfo } from '../lib/gmail-auth';
import { tauriFetch } from '../lib/tauri-fetch';
import { getErrorMessage } from '../lib/error-utils';
import { extractAttachmentNames, extractGmailBodyText, getGmailHeaderValue, parseFromHeader, type GmailPayload } from '../lib/gmail-message-utils';

// ── Time formatting ──────────────────────────────────
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ── Fetch emails from Gmail API for a single account ─
async function fetchEmailsForAccount(accessToken: string, accountId: string): Promise<GmailEmail[]> {
  const listRes = await tauriFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=in:inbox',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const errText = await listRes.text();
    throw new Error(`Gmail API ${listRes.status}: ${errText.slice(0, 200)}`);
  }

  const listData = await listRes.json();
  if (!listData.messages) return [];

  const emails: GmailEmail[] = [];

  for (const item of listData.messages.slice(0, 50)) {
    try {
      const msgRes = await tauriFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msg = await msgRes.json();
      const payload = msg.payload as GmailPayload | undefined;
      const from = getGmailHeaderValue(payload?.headers, 'From');
      const to = getGmailHeaderValue(payload?.headers, 'To');
      const subject = getGmailHeaderValue(payload?.headers, 'Subject') || '(Không có tiêu đề)';
      const date = getGmailHeaderValue(payload?.headers, 'Date');
      const bodyText = extractGmailBodyText(payload, msg.snippet || '');
      const attachments = extractAttachmentNames(payload);
      const parsedFrom = parseFromHeader(from);

      emails.push({
        id: `${accountId}-${item.id}`,
        gmail_id: item.id,
        account_id: accountId,
        subject,
        sender_name: parsedFrom.senderName,
        sender_email: parsedFrom.senderEmail,
        snippet: msg.snippet || '',
        body: bodyText.slice(0, 5000),
        category: attachments.length > 0 ? attachments.join('||') : '',
        timestamp: parseInt(msg.internalDate) || Date.parse(date) || Date.now(),
        is_read: !msg.labelIds?.includes('UNREAD'),
        labels: to,
      });
    } catch (e) {
      console.warn('Failed to fetch message:', item.id, e);
    }
  }

  return emails;
}

// ══════════════════════════════════════════════════════
export function Gmail() {
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [accounts, setAccounts] = useState<GmailAccountInfo[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const hasFetched = useRef(false);

  const addLog = (msg: string) => {
    console.log('[Gmail]', msg);
    setSyncLog(prev => [...prev.slice(-5), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const loadFromDb = useCallback(async (accountId?: string) => {
    const data = await getGmailEmails(accountId || 'all');
    setEmails(data);
  }, []);

  // Sync all accounts in parallel
  const syncAllAccounts = useCallback(async () => {
    setSyncing(true);
    setSyncError('');
    try {
      const accs = await getGmailAccountList();
      if (accs.length === 0) {
        setSyncError('Chưa có tài khoản Gmail nào.');
        setSyncing(false);
        return;
      }

      addLog(`Syncing ${accs.length} account(s)...`);

      const results = await Promise.allSettled(
        accs.map(async (acc) => {
          const token = await refreshAccountToken(acc.id);
          if (!token) {
            addLog(`⚠ ${acc.email}: token refresh failed`);
            return 0;
          }
          const fetched = await fetchEmailsForAccount(token, acc.id);
          if (fetched.length > 0) {
            await saveGmailEmails(fetched);
          }
          addLog(`✓ ${acc.email}: ${fetched.length} emails`);
          return fetched.length;
        })
      );

      const total = results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? (r.value || 0) : 0), 0);
      addLog(`Done: ${total} total emails synced`);
      await loadFromDb(activeTab);
    } catch (e: unknown) {
      const msg = getErrorMessage(e);
      setSyncError(`Sync failed: ${msg}`);
      addLog(`ERROR: ${msg}`);
    }
    setSyncing(false);
  }, [loadFromDb, activeTab]);

  useEffect(() => {
    (async () => {
      const c = await isGmailConnected();
      setConnected(c);
      if (c) {
        const accs = await getGmailAccountList();
        setAccounts(accs);
        await loadFromDb('all');
        setLoading(false);

        if (!hasFetched.current) {
          hasFetched.current = true;
          syncAllAccounts();
        }
      } else {
        setLoading(false);
      }
    })();
  }, [loadFromDb, syncAllAccounts]);

  // Handle tab change
  const handleTabChange = async (tabId: string) => {
    setActiveTab(tabId);
    await loadFromDb(tabId);
  };

  // Filter by search
  const filtered = searchQuery
    ? emails.filter(e =>
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.sender_email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : emails;

  // Get account color for a given email
  const getAccountColor = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.color || '#888';
  };

  if (!connected) {
    return (
      <>
        <Header title="Gmail" subtitle="Connect your Google account in Settings" />
        <div className="page-content">
          <div className="empty-state">
            <Mail size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h3>Gmail chưa kết nối</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              Vào Settings → Gmail Integration → Thêm tài khoản để bắt đầu
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Gmail"
        subtitle={syncing ? 'Đang đồng bộ...' : `${emails.length} emails`}
      />
      <div className="page-content">
        <div className="gmail-wrapper">

          {/* Account Tabs */}
          {accounts.length > 1 && (
            <div className="gmail-tabs">
              <button
                className={`gmail-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => handleTabChange('all')}
              >
                <Mail size={12} />
                All ({emails.length})
              </button>
              {accounts.map(acc => (
                <button
                  key={acc.id}
                  className={`gmail-tab ${activeTab === acc.id ? 'active' : ''}`}
                  onClick={() => handleTabChange(acc.id)}
                  style={{ '--tab-color': acc.color } as React.CSSProperties}
                >
                  <span className="gmail-tab-dot" style={{ background: acc.color }} />
                  {acc.email.split('@')[0]}
                </button>
              ))}
            </div>
          )}

          {/* Toolbar */}
          <div className="gmail-toolbar">
            <div className="gmail-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Tìm kiếm email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gmail-search-input"
              />
            </div>
            <button className="gmail-sync-btn" onClick={syncAllAccounts} disabled={syncing}>
              <RefreshCw size={13} className={syncing ? 'spinning' : ''} />
              {syncing ? 'Đang sync...' : 'Sync'}
            </button>
          </div>

          {/* Error & Debug Log */}
          {syncError && (
            <div style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-sm)', margin: '0 0 8px 0', fontSize: 'var(--text-xs)', color: '#ef4444' }}>
              ⚠️ {syncError}
            </div>
          )}
          {syncLog.length > 0 && (
            <div style={{ padding: '6px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', margin: '0 0 8px 0', fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)', maxHeight: 80, overflow: 'auto' }}>
              {syncLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          {/* Email List */}
          <div className="gmail-list">
            {loading ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <RefreshCw size={20} className="spinning" style={{ opacity: 0.4 }} />
                <p style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>Đang tải...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <Mail size={32} style={{ opacity: 0.2 }} />
                <p style={{ marginTop: 8, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                  {searchQuery ? 'Không tìm thấy email' : syncing ? 'Đang fetch email lần đầu...' : 'Chưa có email. Bấm Sync để tải.'}
                </p>
              </div>
            ) : (
              filtered.map(email => {
                const isExpanded = expandedId === email.id;
                const attachments = email.category ? email.category.split('||').filter(Boolean) : [];
                const toEmail = email.labels || '';
                const acColor = getAccountColor(email.account_id);

                return (
                  <div
                    key={email.id}
                    className={`gmail-email ${!email.is_read ? 'unread' : ''} ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : email.id)}
                  >
                    {/* Email Header Row */}
                    <div className="gmail-email-row">
                      {/* Sender Avatar with Account Color */}
                      <div className="gmail-avatar" style={{
                        background: !email.is_read ? `${acColor}18` : 'var(--bg-surface)',
                        color: !email.is_read ? acColor : 'var(--text-muted)',
                        borderLeft: accounts.length > 1 ? `3px solid ${acColor}` : 'none',
                      }}>
                        {email.sender_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Email Content */}
                      <div className="gmail-email-content">
                        <div className="gmail-email-top">
                          <span className={`gmail-sender ${!email.is_read ? 'unread' : ''}`}>
                            {email.sender_name}
                          </span>
                          <span className="gmail-time">
                            <Clock size={10} /> {timeAgo(email.timestamp)}
                          </span>
                        </div>
                        <div className={`gmail-subject ${!email.is_read ? 'unread' : ''}`}>
                          {email.subject}
                        </div>
                        {!isExpanded && (
                          <div className="gmail-snippet">{email.snippet}</div>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="gmail-email-meta">
                        {attachments.length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            <Paperclip size={10} /> {attachments.length}
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <div className="gmail-email-body">
                        <div className="gmail-body-header">
                          <div>
                            <div>From: <strong>{email.sender_name}</strong> &lt;{email.sender_email}&gt;</div>
                            {toEmail && <div style={{ marginTop: 2 }}>To: {toEmail}</div>}
                          </div>
                          <span>{new Date(email.timestamp).toLocaleString('vi-VN')}</span>
                        </div>
                        {attachments.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {attachments.map((a, i) => (
                              <span key={i} style={{
                                fontSize: 'var(--text-xs)', padding: '2px 6px',
                                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: 3,
                              }}>
                                <Paperclip size={10} /> {a}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="gmail-body-text">
                          {email.body || email.snippet}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
