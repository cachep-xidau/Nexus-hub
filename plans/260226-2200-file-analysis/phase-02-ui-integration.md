# Phase 2: UI Integration — Inbox + AI Agent

## Context
- Parent: [plan.md](plan.md)
- Dependencies: Phase 1
- Status: ⬜ pending

## Changes

### [MODIFY] `src/lib/channels.ts`
Add file attachment detection to `SlackService`:
- Parse `msg.files[]` array from Slack messages
- Detect Google Drive links in message text (`drive.google.com`, `docs.google.com`)
- Add `attachments` field to `ChannelMessage` interface:
```typescript
interface FileAttachment {
  name: string;
  url: string;
  type: 'pdf' | 'gdoc' | 'gsheet' | 'gslide' | 'image' | 'text' | 'unknown';
  size?: number;
  source: 'slack' | 'gdrive';
  accessible?: boolean;    // null = unchecked, false = 403
  analysis?: FileAnalysis; // cached AI analysis
}
```

### [MODIFY] `src/pages/Inbox.tsx`
- Show file attachment chips on inbox items
- Click chip → analyze file → show summary panel
- 📎 icon with file count badge
- Red warning badge if Google Drive file not shared

### [MODIFY] `src/pages/Agent.tsx`
- When user sends a message with file context, include file text in AI prompt
- "Analyze this file" command in chat
- Display AI analysis as formatted card (summary, key points, action items)

### [NEW] `src/components/FileAnalysisCard.tsx`
- Reusable component to display file analysis result
- Shows: filename, summary, key points, action items
- Loading state with progress indicator
- Error state for permission issues

### [MODIFY] `src/index.css`
- `.file-chip` — pill showing attached file name
- `.file-analysis-card` — analysis result display
- `.file-warning` — permission warning badge

## Acceptance
- [ ] Slack file attachments visible in Inbox
- [ ] Google Drive links detected in messages
- [ ] Click file → download + analyze
- [ ] AI summary card displayed
- [ ] Permission warning for unshared files
- [ ] AI Agent can discuss file content
