// ── File Analysis Service ────────────────────────────
// Downloads files from Slack & Google Drive, extracts text, AI analysis.
// NOTE: pdfjs-dist and @tauri-apps/plugin-http are lazy-loaded to prevent
// module-init crashes in Tauri WebView (white screen).

let _tauriFetch: typeof fetch | null = null;
async function getTauriFetch() {
    if (!_tauriFetch) {
        try {
            const mod = await import('@tauri-apps/plugin-http');
            _tauriFetch = mod.fetch;
        } catch {
            // Fallback to native fetch if plugin not available
            _tauriFetch = globalThis.fetch.bind(globalThis);
        }
    }
    return _tauriFetch;
}

let _pdfjsLib: typeof import('pdfjs-dist') | null = null;
async function getPdfjsLib() {
    if (!_pdfjsLib) {
        _pdfjsLib = await import('pdfjs-dist');
        _pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
        ).toString();
    }
    return _pdfjsLib;
}

// ── Types ───────────────────────────────────────────

export interface FileAttachment {
    name: string;
    url: string;
    downloadUrl: string;
    type: FileType;
    size?: number;
    source: 'slack' | 'gdrive';
    accessible: boolean;
    accessError?: string;
    analysis?: FileAnalysis;
}

export interface FileAnalysis {
    summary: string;
    keyPoints: string[];
    actionItems: string[];
    language: string;
    wordCount: number;
    analyzedAt: number;
}

export type FileType = 'pdf' | 'text' | 'gdoc' | 'gsheet' | 'gslide' | 'image' | 'unknown';

// ── Google Drive URL Parsing ────────────────────────

interface DriveFileInfo {
    fileId: string;
    type: 'doc' | 'sheet' | 'slide' | 'file';
    exportUrl: string;
}

const DRIVE_PATTERNS = [
    { regex: /docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/, type: 'doc' as const },
    { regex: /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/, type: 'sheet' as const },
    { regex: /docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/, type: 'slide' as const },
    { regex: /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/, type: 'file' as const },
    { regex: /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/, type: 'file' as const },
];

export function parseGoogleDriveUrl(url: string): DriveFileInfo | null {
    for (const pattern of DRIVE_PATTERNS) {
        const match = url.match(pattern.regex);
        if (match) {
            const fileId = match[1];
            let exportUrl: string;
            switch (pattern.type) {
                case 'doc':
                    exportUrl = `https://docs.google.com/document/d/${fileId}/export?format=txt`;
                    break;
                case 'sheet':
                    exportUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
                    break;
                case 'slide':
                    exportUrl = `https://docs.google.com/presentation/d/${fileId}/export?format=txt`;
                    break;
                default:
                    exportUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            }
            return { fileId, type: pattern.type, exportUrl };
        }
    }
    return null;
}

// ── Detect file links in message text ───────────────

export function detectFileLinks(text: string): FileAttachment[] {
    const attachments: FileAttachment[] = [];
    const urlRegex = /https?:\/\/[^\s<>]+/g;
    const urls = text.match(urlRegex) || [];

    for (const url of urls) {
        const driveInfo = parseGoogleDriveUrl(url);
        if (driveInfo) {
            const typeMap: Record<string, FileType> = {
                doc: 'gdoc', sheet: 'gsheet', slide: 'gslide', file: 'pdf',
            };
            attachments.push({
                name: `Google ${driveInfo.type === 'doc' ? 'Docs' : driveInfo.type === 'sheet' ? 'Sheets' : driveInfo.type === 'slide' ? 'Slides' : 'Drive'} file`,
                url,
                downloadUrl: driveInfo.exportUrl,
                type: typeMap[driveInfo.type] || 'unknown',
                source: 'gdrive',
                accessible: true, // will be checked on download
            });
        }
    }
    return attachments;
}

// ── Detect Slack file attachments ───────────────────

export interface SlackFileObject {
    id: string;
    name: string;
    mimetype: string;
    filetype: string;
    size: number;
    url_private: string;
    url_private_download: string;
}

export function parseSlackFiles(files: SlackFileObject[]): FileAttachment[] {
    return files.map(f => {
        let type: FileType = 'unknown';
        if (f.mimetype === 'application/pdf' || f.filetype === 'pdf') type = 'pdf';
        else if (f.mimetype?.startsWith('text/') || ['md', 'txt', 'csv', 'json'].includes(f.filetype)) type = 'text';
        else if (f.mimetype?.startsWith('image/')) type = 'image';

        return {
            name: f.name,
            url: f.url_private,
            downloadUrl: f.url_private_download || f.url_private,
            type,
            size: f.size,
            source: 'slack' as const,
            accessible: true,
        };
    });
}

// ── Download File ───────────────────────────────────

export async function downloadFile(
    url: string,
    headers?: Record<string, string>
): Promise<{ data: Uint8Array; contentType: string; status: number }> {
    const fetchFn = await getTauriFetch();
    const res = await fetchFn(url, {
        method: 'GET',
        headers: headers || {},
    });

    if (res.status === 403) {
        return { data: new Uint8Array(), contentType: '', status: 403 };
    }
    if (res.status === 404) {
        return { data: new Uint8Array(), contentType: '', status: 404 };
    }

    const contentType = res.headers.get('content-type') || '';
    const arrayBuffer = await res.arrayBuffer();
    return {
        data: new Uint8Array(arrayBuffer),
        contentType,
        status: res.status,
    };
}

// ── Extract Text from PDF ───────────────────────────

export async function extractPdfText(data: Uint8Array): Promise<string> {
    const pdfjs = await getPdfjsLib();
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const text = content.items.map((item: any) => item.str).join(' ');
        pages.push(text);
    }

    return pages.join('\n\n');
}

// ── Extract Text (any type) ─────────────────────────

export async function extractText(data: Uint8Array, fileType: FileType): Promise<string> {
    switch (fileType) {
        case 'pdf':
            return extractPdfText(data);
        case 'text':
        case 'gdoc':
        case 'gsheet':
        case 'gslide':
            return new TextDecoder().decode(data);
        default:
            return '[Unsupported file type]';
    }
}

// ── AI Analysis ─────────────────────────────────────

export async function analyzeWithAI(
    text: string,
    fileName: string,
    openaiKey: string
): Promise<FileAnalysis> {
    // Truncate to ~8000 chars for API limits
    const truncated = text.length > 8000 ? text.slice(0, 8000) + '\n...[truncated]' : text;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You analyze documents and return JSON. Always respond with valid JSON only, no markdown.
Format: {"summary":"2-3 sentences","keyPoints":["point1","point2"],"actionItems":["item1"],"language":"en/vi/etc"}`
                },
                {
                    role: 'user',
                    content: `Analyze this file "${fileName}":\n\n${truncated}`
                }
            ],
            temperature: 0.3,
            max_tokens: 800,
        }),
    });

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    try {
        const parsed = JSON.parse(content);
        return {
            summary: parsed.summary || 'No summary available',
            keyPoints: parsed.keyPoints || [],
            actionItems: parsed.actionItems || [],
            language: parsed.language || 'unknown',
            wordCount: text.split(/\s+/).length,
            analyzedAt: Date.now(),
        };
    } catch {
        return {
            summary: content,
            keyPoints: [],
            actionItems: [],
            language: 'unknown',
            wordCount: text.split(/\s+/).length,
            analyzedAt: Date.now(),
        };
    }
}

// ── Full Analysis Pipeline ──────────────────────────

export async function analyzeFile(
    attachment: FileAttachment,
    botToken?: string,
    openaiKey?: string,
): Promise<FileAttachment> {
    const headers: Record<string, string> = {};
    if (attachment.source === 'slack' && botToken) {
        headers['Authorization'] = `Bearer ${botToken}`;
    }

    // Download
    const { data, status } = await downloadFile(attachment.downloadUrl, headers);

    if (status === 403) {
        return {
            ...attachment,
            accessible: false,
            accessError: '⚠️ File chưa được chia sẻ cho bạn',
        };
    }
    if (status === 404) {
        return {
            ...attachment,
            accessible: false,
            accessError: '⚠️ File không tồn tại hoặc đã bị xóa',
        };
    }
    if (data.length === 0) {
        return {
            ...attachment,
            accessible: false,
            accessError: '⚠️ Không thể tải file',
        };
    }

    // Extract text
    const text = await extractText(data, attachment.type);

    // AI analysis (if key available)
    if (openaiKey && text && text !== '[Unsupported file type]') {
        const analysis = await analyzeWithAI(text, attachment.name, openaiKey);
        return { ...attachment, accessible: true, analysis };
    }

    return { ...attachment, accessible: true };
}
