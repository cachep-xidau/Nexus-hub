# Phase 3: Background Polling & SQLite Sync

## Context
- Parent: [plan.md](plan.md)
- Dependencies: Phase 1, Phase 2

## Changes

### [MODIFY] `src/lib/channels.ts`

#### 1. Polling manager
```typescript
class SlackPoller {
  private interval: number = 30000; // 30s
  private timer?: number;

  start(onMessages: (msgs: ChannelMessage[]) => void)
  stop()
  setInterval(ms: number)
}
```

#### 2. Last timestamp tracking
- Store `last_ts` per channel in SQLite `settings` table
- On each poll, only fetch messages newer than `last_ts`
- Update `last_ts` after successful fetch

### [MODIFY] `src/lib/db.ts`

#### 3. Message storage
- Store fetched messages in `messages` table
- Dedup by `slack_ts + channel_id`
- Mark as read/unread

### [MODIFY] `src/components/layout/Sidebar.tsx`

#### 4. Unread badge count
- Show unread count badge on Inbox nav item
- Red dot for urgent (@mention, @channel)

## Acceptance
- [ ] Polling fetches new messages every 30s
- [ ] No duplicate messages
- [ ] Unread badge updates in real-time
- [ ] `last_ts` persisted across app restarts
