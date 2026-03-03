import { useState, useEffect } from 'react';
import {
    FileText, FileCode, Database, Code, GitBranch, ArrowRightLeft,
    Activity, Users, Monitor, Loader2, Eye, Copy, Check,
} from 'lucide-react';
import { useArtifactsByProject, type RepoArtifact } from '../../lib/hooks/use-repo-api';

const ARTIFACT_ICONS: Record<string, typeof FileText> = {
    'user-story': FileText, 'function-list': FileCode, 'srs': FileCode,
    'erd': Database, 'sql': Code, 'flowchart': GitBranch,
    'sequence-diagram': ArrowRightLeft, 'activity-diagram': Activity,
    'use-case-diagram': Users, 'screen-description': Monitor,
    'prototype': Monitor,
};

const ARTIFACT_LABELS: Record<string, string> = {
    'user-story': 'User Story', 'function-list': 'Function List',
    'srs': 'SRS', 'erd': 'ERD', 'sql': 'SQL',
    'flowchart': 'Flowchart', 'sequence-diagram': 'Sequence',
    'activity-diagram': 'Activity', 'use-case-diagram': 'Use Case',
    'screen-description': 'Screen Desc', 'prototype': 'Prototype',
};

interface ArtifactsTableProps {
    projectId: string;
    refreshKey?: number; // bump to trigger reload
}

export function ArtifactsTable({ projectId, refreshKey }: ArtifactsTableProps) {
    const [selectedArtifact, setSelectedArtifact] = useState<RepoArtifact | null>(null);
    const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
    const [copied, setCopied] = useState(false);

    const artifactsQuery = useArtifactsByProject(projectId);
    const artifacts = artifactsQuery.data ?? [];
    const loading = artifactsQuery.isLoading;
    const refetchArtifacts = artifactsQuery.refetch;

    useEffect(() => {
        if (refreshKey === undefined) return;
        void refetchArtifacts();
    }, [refreshKey, refetchArtifacts]);

    if (loading) {
        return (
            <div className="artifacts-table-section">
                <div className="empty-state" style={{ padding: '2rem' }}>
                    <Loader2 size={20} className="spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="artifacts-table-section">
            <div className="artifacts-table-header">
                <h3 className="repo-section-title" style={{ margin: 0 }}>
                    Generated Artifacts <span className="feature-badge">{artifacts.length}</span>
                </h3>
            </div>

            {artifacts.length === 0 ? (
                <div className="feature-tree-empty" style={{ padding: '2rem' }}>
                    <FileText size={32} style={{ color: 'var(--text-dim)' }} />
                    <p>No artifacts generated yet. Use <strong>Generate Artifacts</strong> to create documents from your PRD.</p>
                </div>
            ) : (
                <div className="artifacts-table-wrap">
                    <table className="artifacts-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Ver</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {artifacts.map(artifact => {
                                const Icon = ARTIFACT_ICONS[artifact.type] || FileText;
                                const label = ARTIFACT_LABELS[artifact.type] || artifact.type;
                                const isSelected = selectedArtifact?.id === artifact.id;
                                const date = new Date(artifact.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                                return (
                                    <tr key={artifact.id}
                                        className={isSelected ? 'selected' : ''}
                                        onClick={() => setSelectedArtifact(isSelected ? null : artifact)}>
                                        <td>
                                            <span className="artifact-type-pill">
                                                <Icon size={13} />
                                                {label}
                                            </span>
                                        </td>
                                        <td className="artifact-title-cell">{artifact.title || label}</td>
                                        <td className="artifact-meta-cell">{artifact.status}</td>
                                        <td className="artifact-ver-cell">v{artifact.version}</td>
                                        <td className="artifact-meta-cell">{date}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Artifact inline preview */}
            {selectedArtifact && (
                <div className="artifact-inline-preview">
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
                            <button className="icon-btn-subtle" onClick={() => {
                                navigator.clipboard.writeText(selectedArtifact.content);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }} title="Copy">
                                {copied ? <Check size={16} style={{ color: 'var(--green)' }} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="artifact-viewer-content">
                        {viewMode === 'raw' ? (
                            <pre className="artifact-raw">{selectedArtifact.content}</pre>
                        ) : (
                            <div className="prd-preview">
                                {selectedArtifact.content.split('\n').map((line, i) => {
                                    const t = line.trimStart();
                                    if (t.startsWith('### ')) return <h3 key={i} className="prd-h3">{t.slice(4)}</h3>;
                                    if (t.startsWith('## ')) return <h2 key={i} className="prd-h2">{t.slice(3)}</h2>;
                                    if (t.startsWith('# ')) return <h1 key={i} className="prd-h1">{t.slice(2)}</h1>;
                                    if (t.startsWith('- ')) return <li key={i} className="prd-li">{t.slice(2)}</li>;
                                    if (/^[-*_]{3,}\s*$/.test(t)) return <hr key={i} />;
                                    if (t === '') return <div key={i} style={{ height: '0.5rem' }} />;
                                    return <p key={i} className="prd-para">{t}</p>;
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
