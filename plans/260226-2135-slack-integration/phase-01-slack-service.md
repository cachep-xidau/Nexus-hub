# Phase 1: Slack Service Layer

## Context
- Parent: [plan.md](plan.md)
- Status: ⬜ pending

## Changes

### [MODIFY] `src/lib/channels.ts`

#### 1. Add `SlackService` class
```typescript
class SlackService {
  private botToken: string;
  private botUserId: string = '';
  private userCache: Map<string, string> = new Map();

  // Initialization
  async init() → auth.test → store botUserId

  // Core methods
  async getChannels() → conversations.list (types: public,private,im,mpim)
  async getHistory(channelId, oldest?) → conversations.history
  async getThreadReplies(channelId, threadTs) → conversations.replies
  async resolveUser(userId) → users.info (cached)

  // Message classification
  classifyMessage(msg): 'dm' | 'mention' | 'thread_reply' | 'channel_broadcast' | 'normal'
  // - Check channel type (im → 'dm')
  // - Check text for <@botUserId> → 'mention'
  // - Check text for <!channel> or <!here> → 'channel_broadcast'
  // - Check thread_ts !== ts → 'thread_reply'
}
```

#### 2. Message type detection logic
```typescript
function classifyMessage(msg, channelType, botUserId): string {
  if (channelType === 'im') return 'dm';
  if (msg.text?.includes(`<@${botUserId}>`)) return 'mention';
  if (msg.text?.includes('<!channel>') || msg.text?.includes('<!here>')) return 'channel_broadcast';
  if (msg.thread_ts && msg.thread_ts !== msg.ts) return 'thread_reply';
  return 'normal';
}
```

#### 3. Fetch flow
```
1. auth.test → get bot user ID
2. conversations.list → all channels (public, private, im, mpim)
3. For each channel:
   a. conversations.history(channel, oldest=last_ts)
   b. Classify each message
   c. For threads user is in: conversations.replies()
4. Resolve user IDs → display names
5. Return typed ChannelMessage[]
```

#### 4. Update `ChannelMessage` interface
```typescript
interface ChannelMessage {
  // ... existing fields
  messageType: 'dm' | 'mention' | 'thread_reply' | 'channel_broadcast' | 'normal';
  threadTs?: string;       // thread parent timestamp
  replyCount?: number;     // number of replies in thread
  channelName?: string;    // resolved channel name
}
```

## Rate Limit Handling
- 15 msg/request for non-Marketplace apps
- Paginate with `cursor` parameter
- 1 req/min limit → batch requests efficiently
- Cache user lookups for 5 minutes

## Acceptance
- [ ] `auth.test` returns bot user ID
- [ ] `classifyMessage` correctly identifies all 5 types
- [ ] User names resolved from IDs
- [ ] Rate limiting respected
