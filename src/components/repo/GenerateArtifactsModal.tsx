import { useState, useCallback, useRef } from 'react';
import {
    X, Loader2, CheckCircle2, AlertCircle, Sparkles, Square,
    FileText, FileCode, Database, Code, GitBranch, ArrowRightLeft,
    Activity, Users, Monitor, ChevronDown, ChevronRight, FolderOpen, Box,
} from 'lucide-react';
import type { ArtifactType } from '../../lib/pipeline/templates';
import {
    runArtifactPipeline,
    GENERABLE_TYPES,
    type PipelineProgress,
    type PipelineResult,
} from '../../lib/pipeline/artifact-orchestrator';
import type { RepoFeature } from '../../lib/hooks/use-repo-api';

// ── Config ───────────────────────────────────────────

const ARTIFACT_TYPES: { id: ArtifactType; label: string; icon: typeof FileText; desc: string }[] = [
    { id: 'user-story', label: 'User Stories', icon: FileText, desc: 'Structured user stories with acceptance criteria' },
    { id: 'function-list', label: 'Function List', icon: FileCode, desc: 'Comprehensive functional requirements table' },
    { id: 'srs', label: 'SRS', icon: FileCode, desc: 'IEEE 830 Software Requirements Specification' },
    { id: 'erd', label: 'ERD', icon: Database, desc: 'Entity-Relationship Diagram in DBML' },
    { id: 'sql', label: 'SQL', icon: Code, desc: 'Production DDL — MySQL + SQL Server' },
    { id: 'screen-description', label: 'Screen Desc', icon: Monitor, desc: 'Screen layouts with field tables' },
    { id: 'flowchart', label: 'Flowchart', icon: GitBranch, desc: 'Process flowcharts in Mermaid' },
    { id: 'sequence-diagram', label: 'Sequence Diagram', icon: ArrowRightLeft, desc: 'Interaction diagrams in PlantUML' },
    { id: 'use-case-diagram', label: 'Use Case', icon: Users, desc: 'Actor/use-case diagrams in PlantUML' },
    { id: 'activity-diagram', label: 'Activity Diagram', icon: Activity, desc: 'Workflow diagrams in Mermaid' },
];

// ── Props ────────────────────────────────────────────

interface GenerateArtifactsModalProps {
    projectId: string;
    prdContent: string;
    features: RepoFeature[];
    preSelectedFunctionId?: string | null;
    onClose: () => void;
    onComplete: () => void;
}

// ── Component ────────────────────────────────────────

export function GenerateArtifactsModal({
    projectId,
    prdContent,
    features,
    preSelectedFunctionId,
    onClose,
    onComplete,
}: GenerateArtifactsModalProps) {
    // Target selection
    const [selectedFeatureId, setSelectedFeatureId] = useState<string>(() => {
        if (preSelectedFunctionId) {
            for (const f of features) {
                if ((f.functions || []).some(fn => fn.id === preSelectedFunctionId)) return f.id;
            }
        }
        return features[0]?.id || '';
    });
    const [selectedFunctionId, setSelectedFunctionId] = useState<string>(
        preSelectedFunctionId || (features[0]?.functions?.[0]?.id || ''),
    );

    // Type selection
    const [selectedTypes, setSelectedTypes] = useState<Set<ArtifactType>>(new Set());

    // Generation state
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<PipelineProgress | null>(null);
    const [result, setResult] = useState<PipelineResult | null>(null);
    const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
    void expandedResults; // Reserved for future expand/collapse UI
    const abortRef = useRef<AbortController | null>(null);

    // PRD preview
    const [prdExpanded, setPrdExpanded] = useState(true);

    const selectedFeature = features.find(f => f.id === selectedFeatureId);

    const handleFeatureChange = (fid: string) => {
        setSelectedFeatureId(fid);
        const feat = features.find(f => f.id === fid);
        if (feat?.functions?.length) {
            setSelectedFunctionId(feat.functions[0].id);
        } else {
            setSelectedFunctionId('');
        }
    };

    const toggleType = (id: ArtifactType) => {
        setSelectedTypes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedTypes.size === ARTIFACT_TYPES.length) {
            setSelectedTypes(new Set());
        } else {
            setSelectedTypes(new Set(ARTIFACT_TYPES.map(t => t.id)));
        }
    };

    // Run pipeline
    const handleGenerate = useCallback(async () => {
        if (selectedTypes.size === 0 || !selectedFunctionId) return;
        setIsRunning(true);
        setResult(null);
        setExpandedResults(new Set());
        abortRef.current = new AbortController();

        const types = GENERABLE_TYPES.filter(t => selectedTypes.has(t));

        try {
            const res = await runArtifactPipeline(
                projectId,
                selectedFunctionId,
                types,
                prdContent,
                (p) => setProgress(p),
                abortRef.current.signal,
            );
            setResult(res);
            // Auto-expand first successful result
            const first = res.results.find(r => r.status === 'success');
            if (first) setExpandedResults(new Set([first.type]));
            if (res.status === 'completed') {
                onComplete();
            }
        } catch (err) {
            console.error('Pipeline error:', err);
        } finally {
            setIsRunning(false);
            abortRef.current = null;
        }
    }, [selectedTypes, selectedFunctionId, projectId, prdContent, onComplete]);

    const handleCancel = () => abortRef.current?.abort();

    const canGenerate = selectedTypes.size > 0 && !!selectedFunctionId && prdContent.trim().length > 0;
    const successCount = result?.results.filter(r => r.status === 'success').length || 0;
    const failCount = result?.results.filter(r => r.status === 'failed').length || 0;
    const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !isRunning) onClose(); }}>
            <div className="generate-fullpage" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="generate-fullpage-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={20} style={{ color: 'var(--accent)' }} />
                        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)' }}>
                            Generate Artifacts
                        </h2>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                        Select a function, choose artifact types, and generate from PRD.
                    </p>
                    {!isRunning && (
                        <button className="icon-btn-subtle" onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px' }}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="generate-fullpage-body">
                    {/* ── Section 1: Target Location ─────────────── */}
                    <div className="gen-section">
                        <h3 className="gen-section-title">
                            <FolderOpen size={16} /> Target Location
                        </h3>
                        <div className="gen-target-grid">
                            <div className="gen-field">
                                <label className="gen-label">
                                    <FolderOpen size={14} style={{ color: '#6366f1' }} /> Feature
                                </label>
                                <select
                                    className="gen-select"
                                    value={selectedFeatureId}
                                    onChange={(e) => handleFeatureChange(e.target.value)}
                                    disabled={isRunning}
                                >
                                    {features.length === 0 && <option value="">No features</option>}
                                    {features.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="gen-field">
                                <label className="gen-label">
                                    <Box size={14} style={{ color: '#06b6d4' }} /> Function
                                </label>
                                <select
                                    className="gen-select"
                                    value={selectedFunctionId}
                                    onChange={(e) => setSelectedFunctionId(e.target.value)}
                                    disabled={!selectedFeatureId || isRunning}
                                >
                                    {(!selectedFeature || !selectedFeature.functions?.length) && (
                                        <option value="">No functions</option>
                                    )}
                                    {(selectedFeature?.functions || []).map(fn => (
                                        <option key={fn.id} value={fn.id}>{fn.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: PRD Content ──────────────────── */}
                    <div className="gen-section">
                        <div
                            className="gen-section-title gen-section-toggle"
                            onClick={() => setPrdExpanded(!prdExpanded)}
                        >
                            <FileText size={16} /> PRD Content
                            <span className="gen-prd-badge">
                                {prdContent.length.toLocaleString()} chars
                            </span>
                            {prdExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                        {prdExpanded && (
                            <div className="gen-prd-preview">
                                <pre>{prdContent.slice(0, 2000)}{prdContent.length > 2000 ? '\n\n... (truncated)' : ''}</pre>
                            </div>
                        )}
                    </div>

                    {/* ── Section 3: Artifact Types ───────────────── */}
                    {!result && (
                        <div className="gen-section">
                            <div className="gen-section-header">
                                <h3 className="gen-section-title" style={{ marginBottom: 0 }}>
                                    <Sparkles size={16} /> Artifact Types
                                </h3>
                                <button className="btn btn-ghost btn-sm" onClick={selectAll} disabled={isRunning}>
                                    {selectedTypes.size === ARTIFACT_TYPES.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="gen-type-grid">
                                {ARTIFACT_TYPES.map(type => {
                                    const _Icon = type.icon;
                                    void _Icon; // Icon reserved for future type-specific styling
                                    const isSelected = selectedTypes.has(type.id);
                                    return (
                                        <button
                                            key={type.id}
                                            className={`gen-type-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => toggleType(type.id)}
                                            disabled={isRunning}
                                        >
                                            <span className="gen-type-card-label">{type.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Section 4: Generate Button + Progress ──── */}
                    {!result && (
                        <div className="gen-actions">
                            <button
                                className="btn btn-primary"
                                onClick={handleGenerate}
                                disabled={!canGenerate || isRunning}
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 size={16} className="spin" />
                                        Generating... {progressPct}%
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        Generate {selectedTypes.size} Artifact{selectedTypes.size !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                            {isRunning && (
                                <button className="btn btn-ghost" onClick={handleCancel}>
                                    <Square size={14} /> Cancel
                                </button>
                            )}
                            {selectedTypes.size > 0 && !isRunning && (
                                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                    {selectedTypes.size} artifact{selectedTypes.size !== 1 ? 's' : ''} selected
                                </span>
                            )}
                        </div>
                    )}

                    {/* ── Progress Bar (during generation) ────────── */}
                    {isRunning && progress && (
                        <div className="gen-section">
                            <div className="pipeline-progress">
                                <div className="pipeline-progress-header">
                                    <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                                        Generating {progress.current}/{progress.total}
                                    </span>
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                        {progressPct}%
                                    </span>
                                </div>
                                <div className="pipeline-progress-bar">
                                    <div className="pipeline-progress-fill" style={{ width: `${progressPct}%` }} />
                                </div>
                                <div className="pipeline-progress-current">
                                    <Loader2 size={14} className="spin" />
                                    <span>
                                        {ARTIFACT_TYPES.find(t => t.id === progress.currentType)?.label || progress.currentType}
                                    </span>
                                </div>
                            </div>

                            {/* Status log */}
                            <div className="pipeline-log">
                                {progress.results.map((r, i) => (
                                    <div key={i} className={`pipeline-log-item ${r.status}`}>
                                        {r.status === 'success' ? (
                                            <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                                        ) : (
                                            <AlertCircle size={14} style={{ color: 'var(--red)' }} />
                                        )}
                                        <span>{ARTIFACT_TYPES.find(t => t.id === r.type)?.label || r.type}</span>
                                        {r.error && <span className="pipeline-log-error">{r.error.slice(0, 60)}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Section 5: Results ──────────────────────── */}
                    {result && (
                        <div className="gen-section">
                            <div className="gen-section-header">
                                <h3 className="gen-section-title" style={{ marginBottom: 0 }}>
                                    <CheckCircle2 size={16} style={{ color: 'var(--green)' }} /> Results
                                </h3>
                                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                                    {successCount} succeeded{failCount > 0 ? `, ${failCount} failed` : ''}
                                </span>
                            </div>

                            <div className="gen-results">
                                {result.results.map((r, i) => {
                                    const typeConfig = ARTIFACT_TYPES.find(t => t.id === r.type);
                                    return (
                                        <div key={i} className={`gen-result-item ${r.status}`}>
                                            <div className="gen-result-header">
                                                {r.status === 'success' ? (
                                                    <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                                                ) : (
                                                    <AlertCircle size={16} style={{ color: 'var(--red)' }} />
                                                )}
                                                <span style={{ fontWeight: 500 }}>
                                                    {typeConfig?.label || r.type}
                                                </span>
                                                {r.error && (
                                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', marginLeft: 'auto' }}>
                                                        {r.error.slice(0, 80)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="gen-actions" style={{ marginTop: 'var(--space-3)' }}>
                                <button className="btn btn-primary" onClick={onClose}>
                                    Done — View Artifacts
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
