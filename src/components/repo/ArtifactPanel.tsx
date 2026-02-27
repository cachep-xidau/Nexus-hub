import { useState, useEffect } from 'react';
import {
    FileText, FileCode, Database, Code, GitBranch, ArrowRightLeft,
    Activity, Users, Monitor, Loader2, Eye, Pencil, Copy, Check, Archive,
} from 'lucide-react';
import { getArtifactTree, type RepoFeature, type RepoArtifact } from '../../lib/repo-db';

const ARTIFACT_ICONS: Record<string, typeof FileText> = {
    'user-story': FileText, 'function-list': FileCode, 'srs': FileCode,
    'erd': Database, 'sql': Code, 'flowchart': GitBranch,
    'sequence-diagram': ArrowRightLeft, 'activity-diagram': Activity,
    'use-case-diagram': Users, 'screen-description': Monitor,
};

const ARTIFACT_LABELS: Record<string, string> = {
    'user-story': 'User Stories', 'function-list': 'Function List',
    'srs': 'SRS', 'erd': 'ERD', 'sql': 'SQL',
    'flowchart': 'Flowchart', 'sequence-diagram': 'Sequence Diagram',
    'activity-diagram': 'Activity Diagram', 'use-case-diagram': 'Use Case',
    'screen-description': 'Screen Desc',
};

interface ArtifactPanelProps {
    projectId: string;
    features: RepoFeature[];
}

export function ArtifactPanel({ projectId }: ArtifactPanelProps) {
    const [tree, setTree] = useState<RepoFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArtifact, setSelectedArtifact] = useState<RepoArtifact | null>(null);
    const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadTree();
    }, [projectId]);

    const loadTree = async () => {
        setLoading(true);
        const data = await getArtifactTree(projectId, 'current');
        setTree(data);
        setLoading(false);
    };

    const totalArtifacts = tree.reduce((s, f) =>
        s + (f.functions || []).reduce((fs, fn) => fs + (fn.artifacts?.length || 0), 0), 0);

    const handleCopy = () => {
        if (!selectedArtifact) return;
        navigator.clipboard.writeText(selectedArtifact.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Simple markdown preview
    const renderPreview = (text: string) => {
        return text.split('\n').map((line, i) => {
            const t = line.trimStart();
            if (t.startsWith('### ')) return <h3 key={i} className="prd-h3">{t.slice(4)}</h3>;
            if (t.startsWith('## ')) return <h2 key={i} className="prd-h2">{t.slice(3)}</h2>;
            if (t.startsWith('# ')) return <h1 key={i} className="prd-h1">{t.slice(2)}</h1>;
            if (t.startsWith('- ')) return <li key={i} className="prd-li">{t.slice(2)}</li>;
            if (/^[-*_]{3,}\s*$/.test(t)) return <hr key={i} />;
            if (t === '') return <div key={i} style={{ height: '0.5rem' }} />;
            return <p key={i} className="prd-para">{t}</p>;
        });
    };

    if (loading) {
        return (
            <div className="artifact-panel">
                <div className="empty-state"><Loader2 size={24} className="spin" /></div>
            </div>
        );
    }

    return (
        <div className="artifact-panel">
            <div className="artifact-panel-header">
                <h3 className="repo-section-title" style={{ margin: 0 }}>
                    Artifacts <span className="feature-badge">{totalArtifacts}</span>
                </h3>
            </div>

            {totalArtifacts === 0 ? (
                <div className="feature-tree-empty" style={{ padding: '2rem' }}>
                    <FileText size={32} style={{ color: 'var(--text-dim)' }} />
                    <p>No artifacts generated yet. Use AI Generation to create artifacts from your PRD.</p>
                </div>
            ) : (
                <div className="artifact-tree">
                    {tree.map(feature => (
                        (feature.functions || []).some(fn => (fn.artifacts?.length || 0) > 0) && (
                            <div key={feature.id} className="artifact-feature-group">
                                <div className="artifact-feature-name">{feature.name}</div>
                                {(feature.functions || []).map(fn => (
                                    (fn.artifacts?.length || 0) > 0 && (
                                        <div key={fn.id} className="artifact-function-group">
                                            <div className="artifact-function-name">{fn.name}</div>
                                            {(fn.artifacts || []).map(artifact => {
                                                const Icon = ARTIFACT_ICONS[artifact.type] || FileText;
                                                const label = ARTIFACT_LABELS[artifact.type] || artifact.type;
                                                const isSelected = selectedArtifact?.id === artifact.id;
                                                return (
                                                    <div key={artifact.id}
                                                        className={`artifact-item ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => setSelectedArtifact(artifact)}>
                                                        <Icon size={14} />
                                                        <span className="artifact-item-title">
                                                            {artifact.title || label}
                                                        </span>
                                                        <span className="artifact-item-version">v{artifact.version}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )
                                ))}
                            </div>
                        )
                    ))}
                </div>
            )}

            {/* Artifact viewer */}
            {selectedArtifact && (
                <div className="artifact-viewer">
                    <div className="artifact-viewer-header">
                        <div>
                            <h4 className="artifact-viewer-title">
                                {selectedArtifact.title || ARTIFACT_LABELS[selectedArtifact.type]}
                            </h4>
                            <span className="artifact-viewer-meta">
                                {ARTIFACT_LABELS[selectedArtifact.type]} · v{selectedArtifact.version}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="icon-btn-subtle"
                                onClick={() => setViewMode(viewMode === 'preview' ? 'raw' : 'preview')}
                                title={viewMode === 'preview' ? 'Raw' : 'Preview'}>
                                {viewMode === 'preview' ? <Code size={16} /> : <Eye size={16} />}
                            </button>
                            <button className="icon-btn-subtle" onClick={handleCopy} title="Copy">
                                {copied ? <Check size={16} style={{ color: 'var(--green)' }} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="artifact-viewer-content">
                        {viewMode === 'preview' ? (
                            <div className="prd-preview">{renderPreview(selectedArtifact.content)}</div>
                        ) : (
                            <pre className="artifact-raw">{selectedArtifact.content}</pre>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
