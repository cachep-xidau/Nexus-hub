# Phase 1: Install Plugins & File Service

## Context
- Parent: [plan.md](plan.md)
- Status: ⬜ pending

## Step 1: Install Dependencies

### npm
```bash
npm install @tauri-apps/plugin-http pdfjs-dist
```

### Cargo (src-tauri/)
```bash
cargo add tauri-plugin-http
```

### Tauri config (tauri.conf.json)
Add to plugins + CSP:
```json
{
  "plugins": {
    "http": {
      "scope": {
        "allow": [
          { "url": "https://slack.com/**" },
          { "url": "https://files.slack.com/**" },
          { "url": "https://drive.google.com/**" },
          { "url": "https://docs.google.com/**" },
          { "url": "https://www.googleapis.com/**" }
        ]
      }
    }
  }
}
```

### Rust main (lib.rs)
```rust
.plugin(tauri_plugin_http::init())
```

### Slack App — add scope
```
files:read
```

## Step 2: Create `src/lib/file-analysis.ts`

### FileAnalysisService class
```typescript
class FileAnalysisService {
  // Download file via Tauri HTTP plugin (bypass CORS)
  async downloadFile(url: string, headers?: Record<string, string>): Promise<Uint8Array>

  // Detect file type from URL or content-type
  detectFileType(url: string, contentType?: string): 'pdf' | 'text' | 'gdoc' | 'gsheet' | 'gslide' | 'image' | 'unknown'

  // Extract text based on file type
  async extractText(data: Uint8Array, fileType: string): Promise<string>

  // PDF → text via pdfjs-dist
  async extractPdfText(data: Uint8Array): Promise<string>

  // Google Drive link → download URL
  parseGoogleDriveUrl(url: string): { fileId: string; exportUrl: string; type: string } | null

  // Check if Google Drive file is accessible
  async checkDriveAccess(fileId: string): Promise<{ accessible: boolean; error?: string }>

  // AI analysis via OpenAI
  async analyzeContent(text: string, fileName: string): Promise<FileAnalysis>
}

interface FileAnalysis {
  summary: string;        // 2-3 sentence summary
  keyPoints: string[];    // bullet points
  sentiment?: string;     // positive/negative/neutral
  actionItems?: string[]; // detected action items
  language: string;       // detected language
}
```

### Google Drive URL patterns to detect
```
https://drive.google.com/file/d/{FILE_ID}/...
https://docs.google.com/document/d/{FILE_ID}/...
https://docs.google.com/spreadsheets/d/{FILE_ID}/...
https://docs.google.com/presentation/d/{FILE_ID}/...
```

### Export URLs
```
Docs  → https://docs.google.com/document/d/{ID}/export?format=txt
Sheet → https://docs.google.com/spreadsheets/d/{ID}/export?format=csv
Slide → https://docs.google.com/presentation/d/{ID}/export?format=txt
File  → https://drive.google.com/uc?export=download&id={ID}
```

### Permission check flow
```
fetch(exportUrl) →
  200 → download content → parse → analyze
  403 → return { accessible: false, error: "File chưa được chia sẻ cho bạn" }
  404 → return { accessible: false, error: "File không tồn tại" }
```

## Acceptance
- [ ] `tauri-plugin-http` installed + configured
- [ ] `pdfjs-dist` installed
- [ ] `FileAnalysisService` created
- [ ] PDF text extraction works
- [ ] Google Drive URL parsing works
- [ ] Permission check returns 403 warning
- [ ] AI analysis returns summary + key points
