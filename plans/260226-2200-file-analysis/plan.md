---
title: "File Download & AI Analysis (Slack + Google Drive)"
description: "Download attachments, extract text, AI summarize & analyze"
status: pending
priority: P1
effort: 2-3h
tags: [files, pdf, google-drive, ai, analysis]
---

# File Download & AI Analysis Plan

## Goal
Download file đính kèm từ Slack và Google Drive links → extract text → AI phân tích:
1. **Slack files** → download via `url_private` + bot token
2. **Google Drive/Docs links** → download via export URL
3. **PDF parsing** → extract text with `pdfjs-dist`
4. **AI analysis** → send text to OpenAI for summary
5. **Permission check** → 403 = "⚠️ File chưa được chia sẻ"

## Architecture
- **Tauri HTTP plugin** → bypass CORS, native HTTP fetching
- **pdfjs-dist** → client-side PDF text extraction
- **OpenAI** → summarize + analyze extracted text
- **SQLite** → cache file metadata + analysis results

## Phases

### Phase 1: Install Plugins & File Service ⬜
Add `tauri-plugin-http`, `pdfjs-dist`. Create `FileAnalysisService`.
→ [phase-01-file-service.md](phase-01-file-service.md)

### Phase 2: Integrate with Inbox + AI Agent ⬜
Show file attachments in Inbox. AI Agent can analyze files.
→ [phase-02-ui-integration.md](phase-02-ui-integration.md)

## Dependencies to Add
```
npm:   @tauri-apps/plugin-http pdfjs-dist
cargo: tauri-plugin-http
```

## Slack Scope to Add
```
files:read
```

## File Types Supported
| Type | Method |
|------|--------|
| PDF | pdfjs-dist → text extraction |
| Google Docs | Export as text/plain |
| Google Sheets | Export as CSV |
| Google Slides | Export as text/plain |
| Plain text (.txt, .md, .csv) | Direct read |
| Images | Metadata only (no OCR) |

## Verification
- [ ] Download Slack PDF attachment
- [ ] Download Google Drive public file
- [ ] Detect 403 for private Google Drive → warn user
- [ ] Extract text from PDF
- [ ] AI summary of file content
- [ ] Cache analysis in SQLite
