# Slack Integration — Read Messages, Mentions, Threads

## Context
Nexus Hub Tauri desktop app needs full Slack message reading:
- **DMs**: Direct messages sent to the user
- **@mentions**: When someone tags the user's name
- **Thread replies**: Replies in threads the user is involved in
- **@channel/@here**: Broadcast mentions in channels

## Architecture Decision

### Approach: Bot Token + Polling (No WebSocket)
Since this is a **local desktop app** (Tauri), we cannot use Slack Events API (requires a public HTTP endpoint). Instead:

1. **Bot Token** (`xoxb-`) for API access
2. **Polling interval** (every 30-60 seconds) for new messages
3. **Local SQLite** to track `last_ts` per channel (avoid re-fetching)

### Why NOT Events API / Socket Mode?
- Events API needs a public webhook URL — impossible for local app
- Socket Mode requires `connections:write` scope + WebSocket client — adds complexity
- Polling is simpler, reliable, and sufficient for a personal tool

---

## Slack API Methods Required

| Method | Purpose | Scopes |
|--------|---------|--------|
| `conversations.list` | List all channels bot is in | `channels:read`, `groups:read`, `im:read`, `mpim:read` |
| `conversations.history` | Fetch messages from a channel | `channels:history`, `groups:history`, `im:history` |
| `conversations.replies` | Fetch thread replies | Same as history |
| `users.info` | Resolve user ID → display name | `users:read` |
| `auth.test` | Get bot's own user ID | (implicit) |

### Rate Limits (2025+)
- Non-Marketplace apps: **15 messages/request, 1 req/min** (May 2025)
- Internal apps: Tier 3 (50+ req/min)
- Must paginate with `cursor`

---

## Message Type Detection

### 1. DMs (Direct Messages)
- Channel type `im` from `conversations.list`
- Fetch with `conversations.history`

### 2. @mentions (user tagged)
- Parse `msg.text` for `<@USER_ID>` pattern
- Compare with bot's own user ID from `auth.test`
- Filter: `msg.text.includes('<@' + botUserId + '>')`

### 3. Thread replies
- Messages with `thread_ts` !== `ts` are replies
- Use `conversations.replies(channel, thread_ts)` to get full thread
- Track threads user is involved in

### 4. @channel / @here
- Parse `msg.text` for `<!channel>` or `<!here>`
- These are broadcast mentions — treat as high priority

---

## Required Bot Token Scopes (Total: 8)

```
channels:history
channels:read
groups:history
groups:read
im:history
im:read
mpim:history
users:read
```
