import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { PrdEditor } from '../components/repo/PrdEditor';
import { FeatureTree } from '../components/repo/FeatureTree';
import { ArtifactPanel } from '../components/repo/ArtifactPanel';
import { GenerateModal } from '../components/repo/GenerateModal';
import { PrdChat } from '../components/repo/PrdChat';
import { AnalysisTab } from '../components/repo/AnalysisTab';
import { ConnectionsTab } from '../components/repo/ConnectionsTab';
import { GuideSection } from '../components/repo/GuideSection';
import {
    Loader2, AlertCircle, ArrowLeft, FileText, GitBranch, Layers, Settings2,
    Pencil, Check, X, Trash2, Sparkles, MessageSquare, Search, Plug,
    Plus, ShieldCheck, Edit3, Lightbulb, Download, ArrowRight, Eye,
} from 'lucide-react';
import {
    getProject, updateProject, deleteProject, getFeatures,
    type RepoProject, type RepoFeature,
} from '../lib/repo-db';

type Tab = 'overview' | 'analysis' | 'prd' | 'artifacts' | 'connections';
const TABS: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: 'overview', label: 'Overview', icon: Layers },
    { key: 'analysis', label: 'Analysis', icon: Search },
    { key: 'prd', label: 'PRD', icon: FileText },
    { key: 'artifacts', label: 'Artifacts', icon: GitBranch },
    { key: 'connections', label: 'Connections', icon: Plug },
];

export function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const projectId = id!;

    // Read ?tab= from URL
    const initialTab = (() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        return t && ['overview', 'analysis', 'prd', 'artifacts', 'connections'].includes(t) ? t as Tab : 'overview';
    })();

    const [project, setProject] = useState<RepoProject | null>(null);
    const [features, setFeatures] = useState<RepoFeature[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);

    // Edit project
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [showGenerate, setShowGenerate] = useState(false);
    const [showPrdChat, setShowPrdChat] = useState(false);

    const loadProject = useCallback(async () => {
        try {
            const p = await getProject(projectId);
            if (!p) { setError('Project not found'); return; }
            setProject(p);
            setEditName(p.name);
            setEditDesc(p.description || '');
            const feats = await getFeatures(projectId);
            setFeatures(feats);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load project');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { loadProject(); }, [loadProject]);

    const handleSave = async () => {
        if (!editName.trim()) return;
        await updateProject(projectId, { name: editName.trim(), description: editDesc.trim() });
        await loadProject();
        setEditing(false);
    };

    const handleDelete = async () => {
        if (!confirm('Delete this project and all its data?')) return;
        await deleteProject(projectId);
        navigate('/repo');
    };

    const handlePrdSave = async (content: string) => {
        await updateProject(projectId, { prd_content: content });
        await loadProject();
    };

    const refreshFeatures = async () => {
        const feats = await getFeatures(projectId);
        setFeatures(feats);
    };

    if (loading) return (
        <div className="page-content">
            <div className="empty-state"><Loader2 size={32} className="spin" /><h3>Loading project...</h3></div>
        </div>
    );

    if (error || !project) return (
        <div className="page-content">
            <div className="empty-state">
                <AlertCircle size={32} style={{ color: 'var(--error)' }} />
                <h3>{error || 'Project not found'}</h3>
                <button className="btn-secondary" onClick={() => navigate('/repo')}>
                    <ArrowLeft size={14} /> Back to Repo
                </button>
            </div>
        </div>
    );

    // Count totals for overview
    const totalFeatures = features.length;
    const totalFunctions = features.reduce((s, f) => s + (f.functions?.length || 0), 0);
    const totalArtifacts = features.reduce((s, f) =>
        s + (f.functions || []).reduce((fs, fn) => fs + (fn._count?.artifacts || 0), 0), 0);

    return (
        <>
            {/* Header */}
            <div className="project-header">
                <button className="icon-btn-subtle" onClick={() => navigate('/repo')} title="Back">
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
                            projectId={projectId}
                            hasPrd={!!project.prd_content}
                            hasFeatures={totalFeatures > 0}
                            hasArtifacts={totalArtifacts > 0}
                            hasConnections={false}
                            onNavigateTab={(tab) => setActiveTab(tab as Tab)}
                        />

                        {/* Interactive Stats */}
                        <div className="overview-stats">
                            {[
                                { label: 'PRD', value: project.prd_content ? 'Ready' : '—', icon: FileText, tab: 'prd' as Tab },
                                { label: 'Features', value: totalFeatures, icon: Layers, tab: 'artifacts' as Tab },
                                { label: 'Artifacts', value: totalArtifacts, icon: GitBranch, tab: 'artifacts' as Tab },
                                { label: 'Connections', value: 0, icon: Plug, tab: 'connections' as Tab },
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
                            <p className="tab-header-subtitle">Phase 3 — Features & Generated Documents</p>
                        </div>

                        {/* Action Cards */}
                        <div className="prd-action-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 'var(--space-md)' }}>
                            <button className="prd-action-card" onClick={() => setActiveTab('artifacts')}>
                                <div className="prd-action-card-body">
                                    <div className="prd-action-card-icon"><Plus size={18} /></div>
                                    <div>
                                        <div className="prd-action-card-title">Add Features</div>
                                        <div className="prd-action-card-desc">Organize modules & functions</div>
                                    </div>
                                </div>
                                <div className="prd-action-card-cta">Manage tree <ArrowRight size={12} /></div>
                            </button>
                            <button className="prd-action-card" onClick={() => setShowGenerate(true)}
                                disabled={!project.prd_content || features.length === 0}>
                                <div className="prd-action-card-body">
                                    <div className="prd-action-card-icon"><Sparkles size={18} /></div>
                                    <div>
                                        <div className="prd-action-card-title">Generate Artifacts</div>
                                        <div className="prd-action-card-desc">SRS, ERD, User Stories & more</div>
                                    </div>
                                </div>
                                <div className="prd-action-card-cta">
                                    {!project.prd_content ? 'PRD required' : features.length === 0 ? 'Add features first' : <>Tạo artifacts <ArrowRight size={12} /></>}
                                </div>
                            </button>
                        </div>

                        {/* Feature Tree + Artifact Panel */}
                        <FeatureTree
                            projectId={projectId}
                            features={features}
                            onRefresh={refreshFeatures}
                        />
                        <ArtifactPanel
                            projectId={projectId}
                            features={features}
                        />
                    </div>
                )}

                {activeTab === 'analysis' && (
                    <AnalysisTab
                        projectId={projectId}
                        projectName={project.name}
                    />
                )}

                {activeTab === 'connections' && (
                    <ConnectionsTab projectId={projectId} />
                )}
            </div>
        </>
    );
}
