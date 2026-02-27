# Phase 2: Inbox UI — Message Type Display

## Context
- Parent: [plan.md](plan.md)
- Dependencies: Phase 1

## Changes

### [MODIFY] `src/pages/Inbox.tsx`

#### 1. Add message type filter tabs
```
All | DMs | @Mentions | Threads | @Channel
```

#### 2. Message type badges
- 💬 DM → blue badge
- 📌 @Mention → orange badge (high priority)
- 🧵 Thread reply → teal badge
- 📢 @Channel/@Here → red badge (urgent)

#### 3. Thread expandable view
When clicking a thread message, show thread replies inline.

#### 4. Channel name display
Show `#channel-name` instead of raw channel ID.

### [MODIFY] `src/index.css`

Add message type badge styles matching WorkWell color palette.

## Acceptance
- [ ] Filter tabs work for each message type
- [ ] Badges show correct type
- [ ] Thread replies expandable
- [ ] Channel names resolved
