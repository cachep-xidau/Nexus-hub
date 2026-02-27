---
title: "Slack Integration — Read Messages, Mentions & Threads"
description: "Integrate Slack message reading into Nexus Hub Tauri app"
status: pending
priority: P1
effort: 2h
tags: [slack, api, channels, integration]
---

# Slack Integration Plan

## Goal
Read Slack messages in Nexus Hub desktop app:
1. **DMs** — Direct messages sent to user
2. **@mentions** — When someone tags user's name (`<@USER_ID>`)
3. **Thread replies** — Replies in threads user is involved in
4. **@channel/@here** — Broadcast mentions

## Architecture
- Bot Token (`xoxb-`) stored in local SQLite settings
- Polling every 30s (no webhook needed for local app)
- `last_ts` tracking per channel to avoid re-fetching
- User name resolution via `users.info` API

## Phases

### Phase 1: Slack Service Layer ⬜
Rewrite `channels.ts` Slack section with full API coverage.
→ [phase-01-slack-service.md](phase-01-slack-service.md)

### Phase 2: UI — Inbox Filter & Display ⬜
Update Inbox page to show message types with icons/badges.
→ [phase-02-inbox-ui.md](phase-02-inbox-ui.md)

### Phase 3: Background Polling ⬜
Auto-fetch on interval, store in SQLite, badge counts.
→ [phase-03-polling.md](phase-03-polling.md)

## Required Slack Bot Scopes
```
channels:history  channels:read
groups:history    groups:read
im:history        im:read
mpim:history      users:read
```

## Verification
- [ ] Fetch DMs from Slack
- [ ] Detect @mentions in channel messages
- [ ] Fetch thread replies
- [ ] Detect @channel/@here
- [ ] Polling auto-refreshes inbox
- [ ] User names resolved (not raw IDs)
