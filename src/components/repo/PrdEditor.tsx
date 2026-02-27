import { useState, useRef, useCallback } from 'react';
import { Save, Pencil, Eye, Upload, FileText, Loader2 } from 'lucide-react';

interface PrdEditorProps {
    content: string;
    onSave: (content: string) => Promise<void>;
}

export function PrdEditor({ content, onSave }: PrdEditorProps) {
    const [editing, setEditing] = useState(!content);
    const [draft, setDraft] = useState(content);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(draft);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            setDraft(text);
            setEditing(true);
        };
        reader.readAsText(file, 'utf-8');
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    // Simple markdown to HTML for preview
    const renderPreview = (text: string) => {
        return text.split('\n').map((line, i) => {
            const trimmed = line.trimStart();
            if (trimmed.startsWith('### ')) return <h3 key={i} className="prd-h3">{trimmed.slice(4)}</h3>;
            if (trimmed.startsWith('## ')) return <h2 key={i} className="prd-h2">{trimmed.slice(3)}</h2>;
            if (trimmed.startsWith('# ')) return <h1 key={i} className="prd-h1">{trimmed.slice(2)}</h1>;
            if (trimmed.startsWith('- ')) return <li key={i} className="prd-li">{renderInline(trimmed.slice(2))}</li>;
            if (/^[-*_]{3,}\s*$/.test(trimmed)) return <hr key={i} className="prd-hr" />;
            if (trimmed === '') return <div key={i} className="prd-break" />;
            return <p key={i} className="prd-para">{renderInline(trimmed)}</p>;
        });
    };

    const renderInline = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**'))
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            if (part.startsWith('`') && part.endsWith('`'))
                return <code key={i} className="prd-code">{part.slice(1, -1)}</code>;
            return part;
        });
    };

    return (
        <div className="prd-editor">
            {/* Toolbar */}
            <div className="prd-toolbar">
                <div className="prd-toolbar-left">
                    <FileText size={18} style={{ color: 'var(--accent)' }} />
                    <span className="prd-toolbar-title">Product Requirements Document</span>
                </div>
                <div className="prd-toolbar-right">
                    {editing && (
                        <>
                            <button className="icon-btn-subtle" onClick={() => fileInputRef.current?.click()}
                                title="Upload file">
                                <Upload size={16} />
                            </button>
                            <input ref={fileInputRef} type="file" accept=".txt,.md,.markdown" hidden
                                onChange={handleFileUpload} />
                            <button className="icon-btn-subtle" onClick={() => setPreviewMode(!previewMode)}
                                title={previewMode ? 'Edit' : 'Preview'}>
                                {previewMode ? <Pencil size={16} /> : <Eye size={16} />}
                            </button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}
                                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                                {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                                <span>Save</span>
                            </button>
                        </>
                    )}
                    {!editing && content && (
                        <button className="btn-secondary" onClick={() => { setDraft(content); setEditing(true); }}
                            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                            <Pencil size={14} /> Edit
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="prd-content">
                {editing && !previewMode ? (
                    <textarea
                        className="prd-textarea"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Paste or write your PRD here...&#10;&#10;# Product Requirements Document&#10;&#10;## 1. Executive Summary&#10;[Brief description of the product and its purpose]&#10;&#10;## 2. Problem Statement&#10;[What problem does this solve?]&#10;&#10;## 3. Success Metrics&#10;- KPI 1: ...&#10;- KPI 2: ...&#10;&#10;## 4. Product Scope&#10;### User Journeys&#10;- Journey 1: ...&#10;&#10;## 5. Functional Requirements&#10;- FR-01: ...&#10;&#10;## 6. Non-Functional Requirements&#10;- NFR-01: ..."
                    />
                ) : content || draft ? (
                    <div className="prd-preview">
                        {renderPreview(editing ? draft : content)}
                    </div>
                ) : (
                    <div className="prd-empty">
                        <FileText size={48} />
                        <h3>No PRD yet</h3>
                        <p>Paste or write your Product Requirements Document to get started</p>
                        <button className="btn-primary" onClick={() => setEditing(true)}>
                            <Pencil size={14} /> Start Writing
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
