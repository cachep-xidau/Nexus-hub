// ── Channel Connector Types ─────────────────────────
import { type FileAttachment, detectFileLinks, parseSlackFiles, type SlackFileObject } from './file-analysis';
import { tauriFetch } from './tauri-fetch';
export interface ChannelMessage {
  id: string;
  channelType: 'slack' | 'gmail' | 'telegram';
  channelId: string;
  channelName?: string;
  senderName: string;
  senderEmail?: string;
  subject?: string;
  body: string;
  timestamp: number;
  isRead: boolean;
  metadata: string;
  messageType: 'dm' | 'mention' | 'thread_reply' | 'channel_broadcast' | 'normal';
  threadTs?: string;
  replyCount?: number;
  attachments?: FileAttachment[];
}

// ═══════════════════════════════════════════════════
//  SLACK SERVICE
// ═══════════════════════════════════════════════════

interface SlackMessage {
  ts: string;
  text?: string;
  user?: string;
  subtype?: string;
  thread_ts?: string;
  reply_count?: number;
  bot_id?: string;
  files?: SlackFileObject[];
}

interface SlackChannel {
  id: string;
  name?: string;
  is_im?: boolean;
  is_mpim?: boolean;
  is_channel?: boolean;
  is_group?: boolean;
  user?: string; // for IMs, the other user's ID
}

export class SlackService {
  private botToken: string;
  private botUserId: string = '';
  private userCache: Map<string, string> = new Map();
  private channelCache: Map<string, SlackChannel> = new Map();

  constructor(botToken: string) {
    this.botToken = botToken;
  }

  // ── Init: get bot's own user ID ───────────────────
  async init(): Promise<boolean> {
    try {
      const res = await this.api('auth.test');
      if (res.ok) {
        this.botUserId = res.user_id;
        return true;
      }
    } catch (e) { console.error('Slack auth.test failed:', e); }
    return false;
  }

  // ── List all channels bot is in ───────────────────
  async getChannels(): Promise<SlackChannel[]> {
    const channels: SlackChannel[] = [];
    let cursor = '';
    do {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel,im',
        exclude_archived: 'true',
        limit: '200',
      });
      if (cursor) params.set('cursor', cursor);

      const res = await this.api('conversations.list', params);
      if (res.ok && res.channels) {
        for (const ch of res.channels) {
          channels.push(ch);
          this.channelCache.set(ch.id, ch);
        }
        cursor = res.response_metadata?.next_cursor || '';
      } else break;
    } while (cursor);

    return channels;
  }

  // ── Fetch messages from a channel ─────────────────
  async getHistory(channelId: string, oldest?: string, limit = 30): Promise<SlackMessage[]> {
    const params = new URLSearchParams({
      channel: channelId,
      limit: String(limit),
    });
    if (oldest) params.set('oldest', oldest);

    const res = await this.api('conversations.history', params);
    if (res.ok && res.messages) return res.messages;
    return [];
  }

  // ── Fetch thread replies ──────────────────────────
  async getThreadReplies(channelId: string, threadTs: string): Promise<SlackMessage[]> {
    const params = new URLSearchParams({
      channel: channelId,
      ts: threadTs,
      limit: '50',
    });
    const res = await this.api('conversations.replies', params);
    if (res.ok && res.messages) {
      // First message is the parent; rest are replies
      return res.messages.slice(1);
    }
    return [];
  }

  // ── Resolve user ID → display name ────────────────
  async resolveUser(userId: string): Promise<string> {
    if (this.userCache.has(userId)) return this.userCache.get(userId)!;
    try {
      const res = await this.api('users.info', new URLSearchParams({ user: userId }));
      if (res.ok && res.user) {
        const name = res.user.profile?.display_name || res.user.real_name || res.user.name || userId;
        this.userCache.set(userId, name);
        return name;
      }
    } catch { /* fallback */ }
    this.userCache.set(userId, userId);
    return userId;
  }

  // ── Classify message type ─────────────────────────
  classifyMessage(msg: SlackMessage, channel: SlackChannel): ChannelMessage['messageType'] {
    // 1. Direct message
    if (channel.is_im || channel.is_mpim) return 'dm';
    // 2. @mention (user tagged)
    if (this.botUserId && msg.text?.includes(`<@${this.botUserId}>`)) return 'mention';
    // 3. @channel or @here broadcast
    if (msg.text?.includes('<!channel>') || msg.text?.includes('<!here>')) return 'channel_broadcast';
    // 4. Thread reply
    if (msg.thread_ts && msg.thread_ts !== msg.ts) return 'thread_reply';
    // 5. Normal message
    return 'normal';
  }

  // ── Clean message text (remove Slack markup) ──────
  cleanText(text: string): string {
    return text
      .replace(/<@(\w+)>/g, '@user')     // @mentions
      .replace(/<#(\w+)\|([^>]+)>/g, '#$2') // #channel links
      .replace(/<!(channel|here)>/g, '@$1') // @channel/@here
      .replace(/<([^|>]+)\|([^>]+)>/g, '$2') // <url|label>
      .replace(/<([^>]+)>/g, '$1');          // <url>
  }
  // ── Full fetch with debug info ─────────────────────
  async fetchAllMessagesDebug(): Promise<{ messages: ChannelMessage[]; logs: string[] }> {
    const logs: string[] = [];

    // Init
    const initOk = await this.init();
    logs.push(initOk ? `✅ auth.test OK — bot user: ${this.botUserId}` : '❌ auth.test FAILED');
    if (!initOk) return { messages: [], logs };

    // Get channels — with raw response logging
    let channels: SlackChannel[] = [];
    try {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel,im',
        limit: '100',
      });
      const rawRes = await this.api('conversations.list', params);
      if (rawRes.ok && rawRes.channels) {
        channels = rawRes.channels;
      } else {
        logs.push(`❌ conversations.list error: ${rawRes.error || 'unknown'}`);
        if (rawRes.needed) logs.push(`⚠️ Missing scope: ${rawRes.needed}`);
        logs.push(`📋 Raw response: ${JSON.stringify(rawRes).slice(0, 300)}`);
        return { messages: [], logs };
      }
    } catch (e: any) {
      logs.push(`❌ conversations.list exception: ${e.message}`);
      return { messages: [], logs };
    }
    logs.push(`📂 ${channels.length} channels visible`);

    // Filter to channels bot is actually a member of
    const memberChannels = channels.filter((c: any) => c.is_member || c.is_im);
    logs.push(`👤 ${memberChannels.length} channels bot is member of`);

    if (memberChannels.length === 0) {
      logs.push('⚠️ Bot is not a member of any channel.');
      logs.push('💡 In Slack, type /invite @BA-AI-Agent in a channel to add the bot.');
      logs.push('💡 Then send a message in that channel and refresh here.');
      return { messages: [], logs };
    }

    // 5-day lookback
    const fiveDaysAgo = String((Date.now() - 5 * 24 * 60 * 60 * 1000) / 1000);
    logs.push(`⏰ oldest param: ${fiveDaysAgo}`);

    const messages: ChannelMessage[] = [];
    let channelIdx = 0;
    for (const channel of memberChannels) {
      try {
        const chName = channel.is_im ? `DM(${channel.user})` : `#${channel.name || channel.id}`;

        // Raw API call with logging for first 3 channels
        const params = new URLSearchParams({
          channel: channel.id,
          limit: '50',
          oldest: fiveDaysAgo,
        });
        const rawRes = await this.api('conversations.history', params);

        if (channelIdx < 3) {
          if (!rawRes.ok) {
            logs.push(`  ${chName}: ❌ ${rawRes.error}${rawRes.needed ? ` (need: ${rawRes.needed})` : ''}`);
          } else {
            logs.push(`  ${chName}: ${rawRes.messages?.length || 0} msgs (ok: ${rawRes.ok})`);
          }
        }

        const slackMsgs: SlackMessage[] = rawRes.ok && rawRes.messages ? rawRes.messages : [];
        const humanMsgs = slackMsgs.filter(m => !m.subtype && !m.bot_id);
        if (channelIdx >= 3) {
          if (humanMsgs.length > 0) logs.push(`  ${chName}: ${slackMsgs.length} raw, ${humanMsgs.length} human`);
        }

        for (const msg of humanMsgs) {
          const messageType = this.classifyMessage(msg, channel);
          const senderName = msg.user ? await this.resolveUser(msg.user) : 'Bot';
          const channelName = channel.is_im ? senderName : channel.name || channel.id;

          const attachments: FileAttachment[] = [];
          if (msg.files && msg.files.length > 0) attachments.push(...parseSlackFiles(msg.files));
          if (msg.text) attachments.push(...detectFileLinks(msg.text));

          messages.push({
            id: crypto.randomUUID(),
            channelType: 'slack',
            channelId: channel.id,
            channelName: channel.is_im ? `DM: ${senderName}` : `#${channelName}`,
            senderName,
            body: this.cleanText(msg.text || ''),
            timestamp: Math.floor(parseFloat(msg.ts) * 1000),
            isRead: false,
            metadata: JSON.stringify({ slackTs: msg.ts, threadTs: msg.thread_ts, replyCount: msg.reply_count }),
            messageType,
            threadTs: msg.thread_ts,
            replyCount: msg.reply_count,
            attachments: attachments.length > 0 ? attachments : undefined,
          });
        }
      } catch (e: any) {
        const chName = channel.is_im ? `DM(${channel.user})` : `#${channel.name || channel.id}`;
        logs.push(`  ❌ ${chName}: ${e.message}`);
      }
      channelIdx++;
    }

    logs.push(`📨 Total: ${messages.length} messages`);
    return { messages, logs };
  }

  // ── Full fetch: get all relevant messages ─────────
  async fetchAllMessages(lastTsMap?: Map<string, string>): Promise<ChannelMessage[]> {
    const messages: ChannelMessage[] = [];

    // Ensure init
    if (!this.botUserId) await this.init();

    // Default: fetch last 5 days
    const fiveDaysAgo = String((Date.now() - 5 * 24 * 60 * 60 * 1000) / 1000);

    // Get channels
    const channels = await this.getChannels();

    for (const channel of channels) {
      try {
        const oldest = lastTsMap?.get(channel.id) || fiveDaysAgo;
        const slackMsgs = await this.getHistory(channel.id, oldest, 50);

        for (const msg of slackMsgs) {
          if (msg.subtype) continue; // skip system messages
          if (msg.bot_id) continue; // skip bot messages

          const messageType = this.classifyMessage(msg, channel);

          const senderName = msg.user ? await this.resolveUser(msg.user) : 'Bot';
          const channelName = channel.is_im
            ? senderName
            : channel.name || channel.id;

          // Detect file attachments
          const attachments: FileAttachment[] = [];
          if (msg.files && msg.files.length > 0) {
            attachments.push(...parseSlackFiles(msg.files));
          }
          // Detect Google Drive links in message text
          if (msg.text) {
            attachments.push(...detectFileLinks(msg.text));
          }

          messages.push({
            id: crypto.randomUUID(),
            channelType: 'slack',
            channelId: channel.id,
            channelName: channel.is_im ? `DM: ${senderName}` : `#${channelName}`,
            senderName,
            body: this.cleanText(msg.text || ''),
            timestamp: Math.floor(parseFloat(msg.ts) * 1000),
            isRead: false,
            metadata: JSON.stringify({
              slackTs: msg.ts,
              threadTs: msg.thread_ts,
              replyCount: msg.reply_count,
            }),
            messageType,
            threadTs: msg.thread_ts,
            replyCount: msg.reply_count,
            attachments: attachments.length > 0 ? attachments : undefined,
          });
        }
      } catch (e) { console.error(`Slack channel ${channel.id} error:`, e); }
    }

    // Sort newest first
    messages.sort((a, b) => b.timestamp - a.timestamp);
    return messages;
  }

  // ── Fetch thread for a specific message ───────────
  async fetchThread(channelId: string, threadTs: string): Promise<ChannelMessage[]> {
    const replies = await this.getThreadReplies(channelId, threadTs);
    const messages: ChannelMessage[] = [];
    const channel = this.channelCache.get(channelId) || { id: channelId };

    for (const msg of replies) {
      if (msg.subtype) continue;
      const senderName = msg.user ? await this.resolveUser(msg.user) : 'Bot';
      messages.push({
        id: crypto.randomUUID(),
        channelType: 'slack',
        channelId,
        senderName,
        body: this.cleanText(msg.text || ''),
        timestamp: Math.floor(parseFloat(msg.ts) * 1000),
        isRead: false,
        metadata: JSON.stringify({ slackTs: msg.ts, threadTs }),
        messageType: 'thread_reply',
        threadTs,
      });
    }
    return messages;
  }

  // ── API helper ────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async api(method: string, params?: URLSearchParams): Promise<any> {
    const url = params
      ? `https://slack.com/api/${method}?${params.toString()}`
      : `https://slack.com/api/${method}`;
    const res = await tauriFetch(url, {
      headers: { 'Authorization': `Bearer ${this.botToken}` },
    });
    return res.json();
  }
}

// ── Legacy wrapper (backward compat) ────────────────
export async function fetchSlackMessages(config: { botToken: string; channels: string }): Promise<ChannelMessage[]> {
  const service = new SlackService(config.botToken);
  return service.fetchAllMessages();
}

// ═══════════════════════════════════════════════════
//  GMAIL
// ═══════════════════════════════════════════════════
export async function fetchGmailMessages(config: { clientId: string; clientSecret: string; refreshToken: string; email: string }): Promise<ChannelMessage[]> {
  const messages: ChannelMessage[] = [];
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return [];

    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=in:inbox`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    const listData = await listRes.json();
    if (!listData.messages) return [];

    for (const item of listData.messages.slice(0, 15)) {
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msgData = await msgRes.json() as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const headers = msgData.payload?.headers || [] as any[];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '(No Subject)';
        const fromMatch = from.match(/^"?(.+?)"?\s*<(.+?)>$/);

        messages.push({
          id: crypto.randomUUID(),
          channelType: 'gmail',
          channelId: config.email,
          senderName: fromMatch ? fromMatch[1] : from,
          senderEmail: fromMatch ? fromMatch[2] : from,
          subject,
          body: msgData.snippet || '',
          timestamp: parseInt(msgData.internalDate),
          isRead: !msgData.labelIds?.includes('UNREAD'),
          metadata: JSON.stringify({ gmailId: item.id }),
          messageType: 'normal',
        });
      } catch { /* skip */ }
    }
  } catch (e) { console.error('Gmail error:', e); }
  return messages;
}

// ═══════════════════════════════════════════════════
//  TELEGRAM
// ═══════════════════════════════════════════════════
export async function fetchTelegramMessages(config: { botToken: string; chatIds: string }): Promise<ChannelMessage[]> {
  const messages: ChannelMessage[] = [];
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.botToken}/getUpdates?limit=50`);
    const data = await res.json();
    if (!data.ok || !data.result) return [];

    const chatFilter = config.chatIds ? config.chatIds.split(',').map(id => id.trim()) : null;

    for (const update of data.result) {
      const msg = update.message || update.channel_post;
      if (!msg || !msg.text) continue;
      if (chatFilter && !chatFilter.includes(String(msg.chat.id))) continue;

      const senderName = msg.from
        ? `${msg.from.first_name || ''}${msg.from.last_name ? ' ' + msg.from.last_name : ''}`.trim()
        : msg.chat.title || 'Unknown';

      messages.push({
        id: crypto.randomUUID(),
        channelType: 'telegram',
        channelId: String(msg.chat.id),
        senderName,
        body: msg.text,
        timestamp: msg.date * 1000,
        isRead: false,
        metadata: JSON.stringify({ telegramMsgId: msg.message_id }),
        messageType: 'normal',
      });
    }
  } catch (e) { console.error('Telegram error:', e); }
  return messages;
}
