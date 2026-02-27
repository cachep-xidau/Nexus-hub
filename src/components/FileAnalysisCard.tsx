import { useState } from 'react';
import { FileText, Download, AlertTriangle, Loader2, ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { type FileAttachment, type FileAnalysis, analyzeFile } from '../lib/file-analysis';
import { getSetting } from '../lib/db';

// ── File Chip (inline in inbox item) ────────────────

export function FileChip({ attachment, onAnalyze }: {
    attachment: FileAttachment;
    onAnalyze: (result: FileAttachment) => void;
}) {
    const [loading, setLoading] = useState(false);

    const typeIcons: Record<string, string> = {
        pdf: '📄', gdoc: '📝', gsheet: '📊', gslide: '📽️',
        text: '📃', image: '🖼️', unknown: '📎',
    };

    const handleClick = async () => {
        if (attachment.analysis || !attachment.accessible) return;
        setLoading(true);
        try {
            const botToken = await getSetting('slack_bot_token');
            const openaiKey = await getSetting('openai_api_key');
            const result = await analyzeFile(attachment, botToken || undefined, openaiKey || undefined);
            onAnalyze(result);
        } catch (e) {
            console.error('File analysis error:', e);
        }
        setLoading(false);
    };

    return (
        <button
            className={`file-chip ${!attachment.accessible ? 'file-chip-warning' : ''}`}
            onClick={handleClick}
            disabled={loading}
            title={attachment.accessible ? 'Click to analyze' : attachment.accessError}
        >
            {loading ? (
                <Loader2 size={12} className="spinning" />
            ) : !attachment.accessible ? (
                <AlertTriangle size={12} />
            ) : (
                <span>{typeIcons[attachment.type] || '📎'}</span>
            )}
            <span className="file-chip-name">{attachment.name}</span>
            {attachment.analysis && <span className="file-chip-done">✓</span>}
        </button>
    );
}

// ── File Attachments Row ────────────────────────────

export function FileAttachments({ attachments, onUpdate }: {
    attachments: FileAttachment[];
    onUpdate: (updated: FileAttachment[]) => void;
}) {
    const [expanded, setExpanded] = useState<FileAttachment | null>(null);

    const handleAnalyze = (index: number, result: FileAttachment) => {
        const updated = [...attachments];
        updated[index] = result;
        onUpdate(updated);
        if (result.analysis) setExpanded(result);
    };

    return (
        <div className="file-attachments">
            <div className="file-chips-row">
                <Paperclip size={12} className="text-muted" />
                {attachments.map((att, i) => (
                    <FileChip
                        key={i}
                        attachment={att}
                        onAnalyze={(result) => handleAnalyze(i, result)}
                    />
                ))}
            </div>
            {expanded?.analysis && (
                <FileAnalysisCard
                    analysis={expanded.analysis}
                    fileName={expanded.name}
                    onClose={() => setExpanded(null)}
                />
            )}
        </div>
    );
}

// ── File Analysis Card ──────────────────────────────

export function FileAnalysisCard({ analysis, fileName, onClose }: {
    analysis: FileAnalysis;
    fileName: string;
    onClose: () => void;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <div className="file-analysis-card animate-fade-in">
            <div className="file-analysis-header">
                <div className="file-analysis-title">
                    <FileText size={14} />
                    <span>{fileName}</span>
                    <span className="text-muted text-sm">
                        {analysis.wordCount.toLocaleString()} words · {analysis.language.toUpperCase()}
                    </span>
                </div>
                <div className="file-analysis-actions">
                    <button className="btn-icon btn-ghost" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    </button>
                    <button className="btn-icon btn-ghost" onClick={onClose}>✕</button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="file-analysis-body">
                    <div className="file-analysis-section">
                        <h4>Summary</h4>
                        <p>{analysis.summary}</p>
                    </div>

                    {analysis.keyPoints.length > 0 && (
                        <div className="file-analysis-section">
                            <h4>Key Points</h4>
                            <ul>
                                {analysis.keyPoints.map((point, i) => (
                                    <li key={i}>{point}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {analysis.actionItems.length > 0 && (
                        <div className="file-analysis-section">
                            <h4>Action Items</h4>
                            <ul className="action-items">
                                {analysis.actionItems.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── File Warning Badge ──────────────────────────────

export function FileWarningBadge({ message }: { message: string }) {
    return (
        <div className="file-warning">
            <AlertTriangle size={13} />
            <span>{message}</span>
        </div>
    );
}

// ── Download Button ─────────────────────────────────

export function DownloadButton({ url, name }: { url: string; name: string }) {
    return (
        <a href={url} download={name} className="btn btn-sm btn-ghost" target="_blank" rel="noreferrer">
            <Download size={13} /> Download
        </a>
    );
}
