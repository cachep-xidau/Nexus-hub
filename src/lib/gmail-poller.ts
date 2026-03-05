import { isGmailConnected, getGmailAccountList, refreshAccountToken } from './gmail-auth';
import { tauriFetch } from './tauri-fetch';
import { classifyEmails } from './email-classifier';
import { saveGmailEmails, type GmailEmail } from './db';
import { getSetting, saveSetting } from './db';
import { getErrorMessage } from './error-utils';
import { extractGmailBodyText, getGmailHeaderValue, parseFromHeader, type GmailPayload } from './gmail-message-utils';

// ── Poller State ─────────────────────────────────────
let pollerInterval: ReturnType<typeof setInterval> | null = null;
let isSyncing = false;

const POLL_INTERVAL = 30 * 60 * 1000; // 30 minutes

// ── Event system ─────────────────────────────────────
type SyncCallback = (data: { type: 'start' | 'done' | 'error'; count?: number; error?: string }) => void;
const listeners: Set<SyncCallback> = new Set();

export function onGmailSync(cb: SyncCallback) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(data: Parameters<SyncCallback>[0]) {
  listeners.forEach(cb => cb(data));
}

// ── Fetch emails from Gmail API ──────────────────────
async function fetchNewEmails(accessToken: string, accountId: string, since?: number): Promise<GmailEmail[]> {
  const query = since
    ? `in:inbox after:${Math.floor(since / 1000)}`
    : 'in:inbox';

  const listRes = await tauriFetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=${encodeURIComponent(query)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const listData = await listRes.json();
  if (!listData.messages) return [];

  const emails: GmailEmail[] = [];

  for (const item of listData.messages.slice(0, 50)) {
    try {
      const msgRes = await tauriFetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json();
      const payload = msgData.payload as GmailPayload | undefined;
      const from = getGmailHeaderValue(payload?.headers, 'From');
      const subject = getGmailHeaderValue(payload?.headers, 'Subject') || '(No Subject)';
      const date = getGmailHeaderValue(payload?.headers, 'Date');
      const bodyText = extractGmailBodyText(payload, msgData.snippet || '');
      const parsedFrom = parseFromHeader(from);

      emails.push({
        id: `${accountId}-${item.id}`,
        gmail_id: item.id,
        account_id: accountId,
        subject,
        sender_name: parsedFrom.senderName,
        sender_email: parsedFrom.senderEmail,
        snippet: msgData.snippet || '',
        body: bodyText.length > 2000 ? bodyText.slice(0, 2000) + '\n[...truncated]' : bodyText,
        category: 'uncategorized',
        timestamp: parseInt(msgData.internalDate) || Date.parse(date) || Date.now(),
        is_read: !msgData.labelIds?.includes('UNREAD'),
        labels: (msgData.labelIds || []).join(','),
      });
    } catch (msgErr) {
      console.warn(`[Gmail] Failed to fetch message ${item.id}:`, msgErr instanceof Error ? msgErr.message : msgErr);
    }
  }

  return emails;
}

// ── Sync Now ─────────────────────────────────────────
export async function syncGmailNow(): Promise<{ count: number }> {
  if (isSyncing) return { count: 0 };
  if (!(await isGmailConnected())) return { count: 0 };

  isSyncing = true;
  emit({ type: 'start' });

  try {
    const accounts = await getGmailAccountList();
    if (accounts.length === 0) {
      emit({ type: 'done', count: 0 });
      return { count: 0 };
    }

    let total = 0;
    for (const account of accounts) {
      const accessToken = await refreshAccountToken(account.id);
      if (!accessToken) {
        console.warn(`[Gmail] Token refresh failed for account ${account.id}, skipping`);
        continue;
      }
      const syncKey = `gmail_last_sync_${account.id}`;
      const lastSyncRaw = await getSetting(syncKey);
      const parsedSync = lastSyncRaw ? Number(lastSyncRaw) : NaN;
      const lastSync = Number.isFinite(parsedSync) ? parsedSync : undefined;
      const emails = await fetchNewEmails(accessToken, account.id, lastSync);

      if (emails.length > 0) {
        // AI classify
        const classified = await classifyEmails(emails);
        await saveGmailEmails(classified);
      }
      await saveSetting(syncKey, String(Date.now()));
      total += emails.length;
    }

    emit({ type: 'done', count: total });
    return { count: total };
  } catch (e: unknown) {
    emit({ type: 'error', error: getErrorMessage(e) });
    return { count: 0 };
  } finally {
    isSyncing = false;
  }
}

// ── Start/Stop Polling ───────────────────────────────
export function startGmailPolling() {
  if (pollerInterval) return;
  // Initial sync
  syncGmailNow();
  // Then every 30 min
  pollerInterval = setInterval(syncGmailNow, POLL_INTERVAL);
}

export function stopGmailPolling() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}

export function isGmailPolling(): boolean {
  return pollerInterval !== null;
}

export function isSyncingNow(): boolean {
  return isSyncing;
}
