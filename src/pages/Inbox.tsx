import { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { MessageCircle, AtSign, GitBranch, Megaphone, Slack, Mail, Send, RefreshCw } from 'lucide-react';
import { SlackService, fetchTelegramMessages, type ChannelMessage } from '../lib/channels';
import { FileAttachments } from '../components/FileAnalysisCard';
import { type FileAttachment } from '../lib/file-analysis';
import { getSetting } from '../lib/db';
import { getGmailAccountList, refreshAccountToken } from '../lib/gmail-auth';
import { tauriFetch } from '../lib/tauri-fetch';
import { getErrorMessage } from '../lib/error-utils';
import { getGmailHeaderValue, parseFromHeader, type GmailPayload } from '../lib/gmail-message-utils';

type FilterType = 'all' | 'dm' | 'mention' | 'thread_reply' | 'channel_broadcast';

const FILTERS: { key: FilterType; label: string; icon: typeof MessageCircle }[] = [
  { key: 'all', label: 'All', icon: MessageCircle },
  { key: 'dm', label: 'DMs', icon: MessageCircle },
  { key: 'mention', label: '@Mentions', icon: AtSign },
  { key: 'thread_reply', label: 'Threads', icon: GitBranch },
  { key: 'channel_broadcast', label: '@Channel', icon: Megaphone },
];

function getChannelIcon(type: string) {
  switch (type) {
    case 'slack': return <Slack size={16} />;
    case 'gmail': return <Mail size={16} />;
    case 'telegram': return <Send size={16} />;
    default: return <MessageCircle size={16} />;
  }
}

function getTypeBadge(type: ChannelMessage['messageType']) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    dm: { bg: 'rgba(0,122,255,0.15)', color: '#007AFF', label: 'DM' },
    mention: { bg: 'rgba(255,149,0,0.15)', color: '#FF9500', label: '@Mention' },
    thread_reply: { bg: 'rgba(90,200,250,0.15)', color: '#5AC8FA', label: 'Thread' },
    channel_broadcast: { bg: 'rgba(255,45,85,0.15)', color: '#FF2D55', label: '@Channel' },
    normal: { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', label: '' },
  };
  const s = styles[type] || styles.normal;
  if (!s.label) return null;
  return <span className="msg-type-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

async function fetchGmailMessagesByAccessToken(accessToken: string, email: string): Promise<ChannelMessage[]> {
  const listRes = await tauriFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();
  if (!listData.messages) return [];

  const messages: ChannelMessage[] = [];

  for (const item of listData.messages.slice(0, 15)) {
    try {
      const msgRes = await tauriFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json();
      const payload = msgData.payload as GmailPayload | undefined;
      const from = getGmailHeaderValue(payload?.headers, 'From') || 'Unknown';
      const subject = getGmailHeaderValue(payload?.headers, 'Subject') || '(No Subject)';
      const parsedFrom = parseFromHeader(from);

      messages.push({
        id: crypto.randomUUID(),
        channelType: 'gmail',
        channelId: email,
        senderName: parsedFrom.senderName,
        senderEmail: parsedFrom.senderEmail,
        subject,
        body: msgData.snippet || '',
        timestamp: parseInt(msgData.internalDate),
        isRead: !msgData.labelIds?.includes('UNREAD'),
        metadata: JSON.stringify({ gmailId: item.id }),
        messageType: 'normal',
      });
    } catch {
      // skip broken item
    }
  }

  return messages;
}

export function Inbox() {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setErrors([]);
    const all: ChannelMessage[] = [];
    const errs: string[] = [];

    try {
      // Slack
      const slackToken = await getSetting('slack_bot_token');
      if (slackToken) {
        errs.push(`ℹ️ Slack token: ${slackToken.slice(0, 15)}...`);
        const slack = new SlackService(slackToken);
        const result = await slack.fetchAllMessagesDebug();
        errs.push(...result.logs);
        all.push(...result.messages);
      } else {
        errs.push('⚠️ No Slack token saved. Go to Settings to add it.');
      }
    } catch (e: unknown) {
      errs.push(`❌ Slack error: ${getErrorMessage(e)}`);
    }

    try {
      const gmailAccounts = await getGmailAccountList();
      if (gmailAccounts.length > 0) {
        const gmailResults = await Promise.allSettled(
          gmailAccounts.map(async (acc) => {
            const token = await refreshAccountToken(acc.id);
            if (!token) throw new Error(`token refresh failed: ${acc.email}`);
            return fetchGmailMessagesByAccessToken(token, acc.email);
          })
        );
        for (const result of gmailResults) {
          if (result.status === 'fulfilled') all.push(...result.value);
        }
      } else {
        // Fallback for legacy single-account settings
        const gmailClientId = await getSetting('gmail_client_id');
        const gmailSecret = await getSetting('gmail_client_secret');
        const gmailRefresh = await getSetting('gmail_refresh_token');
        const gmailEmail = await getSetting('gmail_email');
        if (gmailClientId && gmailSecret && gmailRefresh && gmailEmail) {
          const tokenRes = await tauriFetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: gmailClientId,
              client_secret: gmailSecret,
              refresh_token: gmailRefresh,
              grant_type: 'refresh_token',
            }).toString(),
          });
          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            const gmailMsgs = await fetchGmailMessagesByAccessToken(tokenData.access_token, gmailEmail);
            all.push(...gmailMsgs);
          }
        }
      }
    } catch (e: unknown) { errs.push(`❌ Gmail: ${getErrorMessage(e)}`); }

    try {
      const telegramToken = await getSetting('telegram_bot_token');
      const telegramChats = await getSetting('telegram_chat_ids');
      if (telegramToken) {
        const telegramMsgs = await fetchTelegramMessages({
          botToken: telegramToken, chatIds: telegramChats || '',
        });
        all.push(...telegramMsgs);
      }
    } catch (e: unknown) { errs.push(`❌ Telegram: ${getErrorMessage(e)}`); }

    all.sort((a, b) => b.timestamp - a.timestamp);
    setMessages(all);
    setErrors(errs);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMessages();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMessages]);

  const filtered = filter === 'all'
    ? messages
    : messages.filter((m) => m.messageType === filter);

  const counts = {
    all: messages.length,
    dm: messages.filter(m => m.messageType === 'dm').length,
    mention: messages.filter(m => m.messageType === 'mention').length,
    thread_reply: messages.filter(m => m.messageType === 'thread_reply').length,
    channel_broadcast: messages.filter(m => m.messageType === 'channel_broadcast').length,
  };

  return (
    <>
      <Header
        title="Inbox"
        subtitle={`${messages.length} messages from connected channels`}
        addLabel="Refresh"
        onAdd={loadMessages}
      />
      <div className="page-content">
        {/* Filter Tabs */}
        <div className="filter-tabs">
          {FILTERS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`filter-tab ${filter === key ? 'active' : ''}`}
              onClick={() => setFilter(key)}
            >
              <Icon size={13} />
              {label}
              {counts[key] > 0 && <span className="filter-count">{counts[key]}</span>}
            </button>
          ))}
          <button
            className="btn btn-ghost btn-sm"
            onClick={loadMessages}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>

        {/* Debug Log */}
        {errors.length > 0 && (
          <div style={{ padding: '8px 12px', margin: '0 0 8px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', fontSize: 12 }}>
            {errors.map((err, i) => (
              <div key={i} style={{ padding: '2px 0', color: err.startsWith('❌') ? 'var(--priority-urgent)' : err.startsWith('✅') ? 'var(--green)' : 'var(--text-secondary)' }}>
                {err}
              </div>
            ))}
          </div>
        )}

        {/* Message List */}
        {loading && messages.length === 0 ? (
          <div className="empty-state">
            <RefreshCw size={24} className="spinning" />
            <h3>Loading messages...</h3>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <h3>{filter === 'all' ? 'No messages yet' : `No ${filter.replace('_', ' ')} messages`}</h3>
            <p className="text-muted text-sm">
              {messages.length === 0
                ? 'Connect Slack, Gmail, or Telegram in Settings to get started.'
                : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div className="inbox-list stagger">
            {filtered.map((msg) => (
              <div
                key={msg.id}
                className={`inbox-item ${!msg.isRead ? 'unread' : ''} animate-fade-in`}
              >
                <div className={`avatar ${msg.channelType}`}>
                  {getChannelIcon(msg.channelType)}
                </div>
                <div className="inbox-item-content">
                  <div className="inbox-item-header">
                    <span className="inbox-item-sender">{msg.senderName}</span>
                    {getTypeBadge(msg.messageType)}
                    {msg.channelName && (
                      <span className="inbox-item-channel">{msg.channelName}</span>
                    )}
                    <span className="inbox-item-time">{timeAgo(msg.timestamp)}</span>
                  </div>
                  {msg.subject && <div className="inbox-item-subject">{msg.subject}</div>}
                  <div className="inbox-item-preview">{msg.body}</div>
                  {msg.replyCount && msg.replyCount > 0 && (
                    <div className="inbox-item-thread-count">
                      <GitBranch size={12} />
                      {msg.replyCount} replies
                    </div>
                  )}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <FileAttachments
                      attachments={msg.attachments}
                      onUpdate={(updated: FileAttachment[]) => {
                        const newMessages = messages.map(m =>
                          m.id === msg.id ? { ...m, attachments: updated } : m
                        );
                        setMessages(newMessages);
                      }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
