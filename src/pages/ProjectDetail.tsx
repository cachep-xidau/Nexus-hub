import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PrdEditor } from '../components/repo/PrdEditor';
import { FeatureTree } from '../components/repo/FeatureTree';
import { ArtifactsTable } from '../components/repo/ArtifactsTable';
import { GenerateArtifactsModal } from '../components/repo/GenerateArtifactsModal';
import { PrdChat } from '../components/repo/PrdChat';
import { EpicsChat } from '../components/repo/EpicsChat';
import { AnalysisTab } from '../components/repo/AnalysisTab';
import { ConnectionsTab } from '../components/repo/ConnectionsTab';
import { GuideSection } from '../components/repo/GuideSection';
import { PrototypePanel } from '../components/repo/PrototypePanel';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import {
    Loader2, AlertCircle, ArrowLeft, FileText, GitBranch, Layers,
    Sparkles, Search, Plug, Monitor, Plus, ShieldCheck, Edit3,
    Lightbulb, Download, ArrowRight,
} from 'lucide-react';
import {
    useProject,
    useUpdateProject,
    useFeatures,
    useAnalysisDocs,
} from '../lib/hooks/use-repo-api';

type Tab = 'overview' | 'analysis' | 'prd' | 'artifacts' | 'prototype' | 'connections';
const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'overview', label: 'Overview', icon: Layers },
    { key: 'analysis', label: 'Analysis', icon: Search },
    { key: 'prd', label: 'PRD', icon: FileText },
    { key: 'artifacts', label: 'Artifacts', icon: GitBranch },
    { key: 'prototype', label: 'Prototype', icon: Monitor },
    { key: 'connections', label: 'Connections', icon: Plug },
];

export function ProjectDetail() {
    const { companyId, projectId } = useParams<{ companyId: string; projectId: string }>();
    const navigate = useNavigate();
    const resolvedProjectId = projectId || '';
    const backToRepoPath = companyId ? `/repo/${companyId}` : '/repo';

    // Read ?tab= from URL
    const initialTab = (() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        return t && ['overview', 'analysis', 'prd', 'artifacts', 'prototype', 'connections'].includes(t) ? t as Tab : 'overview';
    })();

    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);

    const [showGenerate, setShowGenerate] = useState(false);
    const [generateFunctionId, setGenerateFunctionId] = useState<string | null>(null);
    const [showPrdChat, setShowPrdChat] = useState(false);
    const [showEpicsChat, setShowEpicsChat] = useState(false);
    const [artifactRefreshKey, setArtifactRefreshKey] = useState(0);

    const projectQuery = useProject(resolvedProjectId);
    const featuresQuery = useFeatures(resolvedProjectId);
    const analysisDocsQuery = useAnalysisDocs(resolvedProjectId);
    const updateProjectMutation = useUpdateProject();

    const project = projectQuery.data ?? null;
    const features = featuresQuery.data ?? [];
    const loading = projectQuery.isLoading || featuresQuery.isLoading;

    const queryError = projectQuery.error || featuresQuery.error;
    const queryErrorMessage = queryError instanceof Error
        ? queryError.message
        : queryError
            ? 'Failed to load project'
            : '';

    const handlePrdSave = async (content: string) => {
        setError('');
        try {
            await updateProjectMutation.mutateAsync({
                id: resolvedProjectId,
                data: { prd_content: content },
            });
            await projectQuery.refetch();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update PRD');
            throw err;
        }
    };

    const refreshFeatures = async () => {
        await featuresQuery.refetch();
    };

    const refreshArtifactTree = useCallback(() => {
        setArtifactRefreshKey(k => k + 1);
    }, []);

    if (loading) return (
        <div className="page-content">
            <div className="empty-state"><Loader2 size={32} className="spin" /><h3>Loading project...</h3></div>
        </div>
    );

    if (error || queryErrorMessage || !project) return (
        <div className="page-content">
            <div className="empty-state">
                <AlertCircle size={32} style={{ color: 'var(--error)' }} />
                <h3>{error || queryErrorMessage || 'Project not found'}</h3>
                <button className="btn-secondary" onClick={() => navigate(backToRepoPath)}>
                    <ArrowLeft size={14} /> Back to Repo
                </button>
            </div>
        </div>
    );

    // Count totals for overview
    const totalFeatures = features.length;
    const totalArtifacts = features.reduce((s, f) =>
        s + (f.functions || []).reduce((fs, fn) => fs + (fn._count?.artifacts || 0), 0), 0);

    return (
        <>
            {/* Header */}
            <div className="project-header">
                <button className="icon-btn-subtle" onClick={() => navigate(backToRepoPath)} title="Back">
                    <ArrowLeft size={18} />
                </button>
                <div className="project-header-info">
                    <h1 className="project-title">{project.name}</h1>
                    {project.description && (
                        <p className="project-desc">{project.description}</p>
                    )}
                </div>
            </div>

            {/* Tab bar */}
            <div className="project-tabs">
                {TABS.map(tab => (
                    <button key={tab.key}
                        className={`project-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}>
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            <div className="page-content">
                {activeTab === 'overview' && (
                    <div className="project-overview">
                        {/* Project Info */}
                        <div className="overview-info-card">
                            <h2 className="overview-info-name">{project.name}</h2>
                            <p className="overview-info-desc">
                                {project.description || 'No description provided. Go to Settings to add one.'}
                            </p>
                        </div>

                        {/* Guide */}
                        <GuideSection
                            projectId={resolvedProjectId}
                            hasPrd={!!project.prd_content}
                            hasFeatures={totalFeatures > 0}
                            hasArtifacts={totalArtifacts > 0}
                            hasConnections={(project._count?.connections || 0) > 0}
                            onNavigateTab={(tab) => setActiveTab(tab as Tab)}
                        />

                        {/* Interactive Stats */}
                        <div className="overview-stats">
                            {[
                                { label: 'PRD', value: project.prd_content ? 'Ready' : '—', icon: FileText, tab: 'prd' as Tab },
                                { label: 'Features', value: totalFeatures, icon: Layers, tab: 'artifacts' as Tab },
                                { label: 'Artifacts', value: totalArtifacts, icon: GitBranch, tab: 'artifacts' as Tab },
                                { label: 'Connections', value: project._count?.connections ?? 0, icon: Plug, tab: 'connections' as Tab },
                            ].map(card => {
                                const Icon = card.icon;
                                return (
                                    <button key={card.label} className="stat-card interactive"
                                        onClick={() => setActiveTab(card.tab)}>
                                        <div className="stat-card-icon">
                                            <Icon size={16} />
                                        </div>
                                        <div className="stat-card-info">
                                            <span className="stat-label">{card.label}</span>
                                            <span className="stat-value">{card.value}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'prd' && (
                    <div className="prd-tab">
                        {/* Tab Header */}
                        <div className="tab-header">
                            <h2 className="tab-header-title">PRD</h2>
                            <p className="tab-header-subtitle">Phase 2 — Product Requirements Document</p>
                        </div>

                        {/* PRD Action Cards */}
                        <div className="prd-action-cards">
                            <button className="prd-action-card" onClick={() => setShowPrdChat(true)}>
                                <div className="prd-action-card-body">
                                    <div className="prd-action-card-icon"><Plus size={18} /></div>
                                    <div>
                                        <div className="prd-action-card-title">Create PRD</div>
                                        <div className="prd-action-card-desc">AI-guided BMAD workflow</div>
                                    </div>
                                </div>
                                <div className="prd-action-card-cta">Bắt đầu <ArrowRight size={12} /></div>
                            </button>
                            <button className="prd-action-card" disabled title="Coming soon">
                                <div className="prd-action-card-body">
                                    <div className="prd-action-card-icon"><ShieldCheck size={18} /></div>
                                    <div>
                                        <div className="prd-action-card-title">Validate PRD</div>
                                        <div className="prd-action-card-desc">BMAD quality scoring</div>
                                    </div>
                                </div>
                                <div className="prd-action-card-cta">Coming soon</div>
                            </button>
                            <button className="prd-action-card" onClick={() => setShowPrdChat(true)}>
                                <div className="prd-action-card-body">
                                    <div className="prd-action-card-icon"><Edit3 size={18} /></div>
                                    <div>
                                        <div className="prd-action-card-title">Edit PRD</div>
                                        <div className="prd-action-card-desc">AI-assisted editing</div>
                                    </div>
                                </div>
                                <div className="prd-action-card-cta">Chỉnh sửa <ArrowRight size={12} /></div>
                            </button>
                        </div>

                        {/* PrdEditor */}
                        <PrdEditor
                            content={project.prd_content || ''}
                            onSave={handlePrdSave}
                        />

                        {/* PRD Document Table */}
                        {project.prd_content && (
                            <div className="prd-doc-section">
                                <h3 className="prd-doc-section-title">Document</h3>
                                <div className="prd-doc-table">
                                    <div className="prd-doc-row">
                                        <div className="prd-doc-cell-main">
                                            <div className="prd-doc-icon"><FileText size={12} /></div>
                                            <span>{project.name} — PRD</span>
                                        </div>
                                        <div className="prd-doc-cell">PRD</div>
                                        <div className="prd-doc-cell">
                                            <span className="prd-doc-status">✓ Ready</span>
                                        </div>
                                        <div className="prd-doc-cell-actions">
                                            <button className="icon-btn-subtle" title="Download"
                                                onClick={() => {
                                                    const blob = new Blob([project.prd_content || ''], { type: 'text/markdown' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a'); a.href = url;
                                                    a.download = `${project.name.replace(/\s+/g, '_')}_PRD.md`;
                                                    a.click(); URL.revokeObjectURL(url);
                                                }}>
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Guidance Tip */}
                        {project.prd_content && (
                            <div className="prd-tip">
                                <Lightbulb size={14} />
                                <span>Tip: Use <strong>Validate PRD</strong> to check quality against BMAD standards, or <strong>Edit PRD</strong> for AI-guided improvements.</span>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'artifacts' && (
                    <div className="project-artifacts-tab">
                        {/* Tab Header */}
                        <div className="tab-header">
                            <h2 className="tab-header-title">Artifacts</h2>
                            <p className="tab-header-subtitle">Phase 4 — Design Documents & BSA Deliverables</p>
                        </div>

                        {/* Action Cards — matching Analysis tab style */}
                        <div className="analysis-cards-grid">
                            <button className="analysis-card" onClick={() => {
                                setGenerateFunctionId(null);
                                setShowGenerate(true);
                            }} disabled={!project.prd_content || features.length === 0}>
                                <Sparkles size={24} />
                                <div>
                                    <div className="analysis-card-name">Freestyle Generate</div>
                                    <div className="analysis-card-desc">Quick artifact generation</div>
                                </div>
                            </button>
                            <button className="analysis-card" onClick={() => setShowEpicsChat(true)}>
                                <Layers size={24} />
                                <div>
                                    <div className="analysis-card-name">BMAD Generate</div>
                                    <div className="analysis-card-desc">Epics & Stories via BMAD chat</div>
                                </div>
                            </button>
                        </div>

                        {/* Artifacts Table */}
                        <ArtifactsTable projectId={resolvedProjectId} refreshKey={artifactRefreshKey} />

                        {/* Feature Tree — collapsible for audit */}
                        <details className="feature-tree-collapsible" style={{ marginTop: 'var(--space-4)' }}>
                            <summary className="repo-section-title" style={{ cursor: 'pointer', userSelect: 'none' }}>
                                Feature Tree <span className="feature-badge">{features.length}</span>
                            </summary>
                            <div style={{ marginTop: 'var(--space-3)' }}>
                                <FeatureTree
                                    projectId={resolvedProjectId}
                                    features={features}
                                    onGenerate={(fnId) => {
                                        setGenerateFunctionId(fnId);
                                        setShowGenerate(true);
                                    }}
                                />
                            </div>
                        </details>
                    </div>
                )}

                {activeTab === 'analysis' && (
                    <AnalysisTab
                        projectId={resolvedProjectId}
                        projectName={project.name}
                    />
                )}

                {activeTab === 'connections' && (
                    <ConnectionsTab projectId={resolvedProjectId} />
                )}

                {activeTab === 'prototype' && (
                    <div className="prototype-tab">
                        <PanelGroup orientation="horizontal" className="prototype-split">
                            <Panel defaultSize={35} minSize={20} className="prototype-context-panel">
                                <div className="prototype-context">
                                    <h3 className="prototype-context-title">Project Context</h3>
                                    {project.prd_content ? (
                                        <div className="prototype-context-prd">
                                            <div className="prototype-context-label">PRD Summary</div>
                                            <div className="prd-preview" style={{ fontSize: '0.8rem', maxHeight: '100%', overflow: 'auto' }}>
                                                {project.prd_content.split('\n').slice(0, 50).map((line, i) => {
                                                    const t = line.trimStart();
                                                    if (t.startsWith('### ')) return <h4 key={i} style={{ fontSize: '0.85rem', margin: '0.5rem 0 0.25rem' }}>{t.slice(4)}</h4>;
                                                    if (t.startsWith('## ')) return <h3 key={i} style={{ fontSize: '0.9rem', margin: '0.75rem 0 0.25rem' }}>{t.slice(3)}</h3>;
                                                    if (t.startsWith('# ')) return <h2 key={i} style={{ fontSize: '1rem', margin: '0.75rem 0 0.25rem' }}>{t.slice(2)}</h2>;
                                                    if (t === '') return <div key={i} style={{ height: '0.25rem' }} />;
                                                    return <p key={i} style={{ margin: '0.15rem 0', color: 'var(--text-secondary)' }}>{t}</p>;
                                                })}
                                                {(project.prd_content.split('\n').length > 50) && (
                                                    <p style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>... (truncated)</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prototype-context-empty">
                                            <FileText size={24} style={{ color: 'var(--text-dim)' }} />
                                            <p>No PRD content yet. Add PRD in the PRD tab first.</p>
                                        </div>
                                    )}
                                    <div className="prototype-context-features">
                                        <div className="prototype-context-label">Features ({features.length})</div>
                                        {features.map(f => (
                                            <div key={f.id} className="prototype-feature-item">
                                                <Layers size={12} />
                                                <span>{f.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Panel>
                            <PanelResizeHandle className="resize-handle" />
                            <Panel defaultSize={65} minSize={40}>
                                <PrototypePanel
                                    projectId={resolvedProjectId}
                                    prdContent={project.prd_content}
                                />
                            </Panel>
                        </PanelGroup>
                    </div>
                )}
            </div>

            {showGenerate && project.prd_content && (
                <GenerateArtifactsModal
                    projectId={resolvedProjectId}
                    prdContent={project.prd_content}
                    features={features}
                    preSelectedFunctionId={generateFunctionId}
                    onClose={() => {
                        setShowGenerate(false);
                        setGenerateFunctionId(null);
                    }}
                    onComplete={() => {
                        setShowGenerate(false);
                        setGenerateFunctionId(null);
                        refreshFeatures();
                        refreshArtifactTree();
                    }}
                />
            )}

            {showPrdChat && (
                <PrdChat
                    projectId={resolvedProjectId}
                    projectName={project.name}
                    existingPrd={project.prd_content || ''}
                    onClose={() => setShowPrdChat(false)}
                    onPrdSaved={async () => {
                        setShowPrdChat(false);
                        await projectQuery.refetch();
                    }}
                />
            )}

            {showEpicsChat && (
                <EpicsChat
                    projectId={resolvedProjectId}
                    projectName={project.name}
                    prdContent={project.prd_content || ''}
                    analysisDocs={(analysisDocsQuery.data ?? []).filter(d => ['prd', 'product-brief'].includes(d.type))}
                    onClose={() => setShowEpicsChat(false)}
                    onEpicsSaved={async () => {
                        setShowEpicsChat(false);
                        await projectQuery.refetch();
                        refreshArtifactTree();
                    }}
                />
            )}
        </>
    );
}
