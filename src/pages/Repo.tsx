import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
    FolderOpen, Plus, MoreHorizontal, Loader2, X, Check, AlertCircle, Building2,
} from 'lucide-react';
import {
    useProjects,
    useCreateProject,
    useDeleteProject,
    type RepoProject,
} from '../lib/hooks/use-repo-api';
import { useCompanies } from '../lib/hooks/use-companies';
import {
    buildEffectiveCompanies,
    normalizeProjectCompanyId,
} from '../lib/repo-company-fallback';

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function ProjectCard({ project, onDelete }: { project: RepoProject; onDelete: (id: string) => void }) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const features = project._count?.features ?? 0;
    const artifacts = project._count?.artifacts ?? 0;
    const connections = project._count?.connections ?? 0;

    // Close dropdown on click outside
    useEffect(() => {
        if (!menuOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [menuOpen]);

    return (
        <div className="repo-card" onClick={() => navigate(`/repo/${project.company_id}/${project.id}`)}>
            {/* Menu */}
            <div className="repo-card-menu" ref={menuRef}>
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="icon-btn-subtle">
                    <MoreHorizontal size={16} />
                </button>
                {menuOpen && (
                    <div className="repo-card-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { navigate(`/repo/${project.company_id}/${project.id}`); setMenuOpen(false); }}>Open Project</button>
                        <button onClick={() => { onDelete(project.id); setMenuOpen(false); }}
                            style={{ color: 'var(--error)' }}>Delete</button>
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="repo-card-header">
                <div className="repo-card-icon">
                    <FolderOpen size={22} />
                </div>
                <div>
                    <h4 className="repo-card-name">{project.name}</h4>
                    <span className="repo-card-stats">
                        {features} features · {artifacts} artifacts · {connections} connections
                    </span>
                </div>
            </div>

            {/* Body */}
            {project.description && (
                <p className="repo-card-desc">{project.description}</p>
            )}
            <p className="repo-card-time">Updated {timeAgo(project.updated_at)}</p>
        </div>
    );
}

export function Repo() {
    const navigate = useNavigate();
    const { companyId: routeCompanyId } = useParams<{ companyId?: string }>();
    const [error, setError] = useState('');

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const companiesQuery = useCompanies();
    const projectsQuery = useProjects();
    const createProjectMutation = useCreateProject();
    const deleteProjectMutation = useDeleteProject();

    const companiesData = companiesQuery.data;
    const allProjectsData = projectsQuery.data;
    const allProjects = useMemo(() => allProjectsData ?? [], [allProjectsData]);
    const effectiveCompanies = useMemo(
        () => buildEffectiveCompanies(companiesData, allProjects),
        [allProjects, companiesData]
    );
    const activeCompany = effectiveCompanies.find(company => company.id === routeCompanyId) ?? null;
    const projects = activeCompany
        ? allProjects.filter(project => normalizeProjectCompanyId(project.company_id) === activeCompany.id)
        : [];
    const loading = projectsQuery.isLoading || companiesQuery.isLoading;
    const creating = createProjectMutation.isPending;
    const queryErrorSource = projectsQuery.error || companiesQuery.error;
    const queryError = queryErrorSource
        ? (queryErrorSource instanceof Error ? queryErrorSource.message : 'Failed to load repository data')
        : '';
    const visibleError = error || queryError;

    const legacyProject = routeCompanyId
        ? allProjects.find(project => project.id === routeCompanyId)
        : undefined;
    const isUnknownCompanyRoute = Boolean(routeCompanyId) && !activeCompany && !legacyProject;

    useEffect(() => {
        if (companiesQuery.isLoading || projectsQuery.isLoading) return;
        if (!routeCompanyId) {
            if (effectiveCompanies.length > 0) navigate(`/repo/${effectiveCompanies[0].id}`, { replace: true });
            return;
        }

        if (activeCompany) return;

        if (legacyProject) {
            navigate(`/repo/${normalizeProjectCompanyId(legacyProject.company_id)}/${legacyProject.id}`, { replace: true });
        }
    }, [
        activeCompany,
        effectiveCompanies,
        companiesQuery.isLoading,
        navigate,
        legacyProject,
        projectsQuery.isLoading,
        routeCompanyId,
    ]);

    const handleCreate = async () => {
        if (!newName.trim() || creating) return;
        setError('');
        try {
            if (!activeCompany) throw new Error('Please select a company before creating a project');
            const created = await createProjectMutation.mutateAsync({
                name: newName.trim(),
                description: newDesc.trim() || undefined,
                companyId: activeCompany.id,
            });
            setNewName('');
            setNewDesc('');
            setShowCreate(false);
            navigate(`/repo/${created.company_id}/${created.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this project and all its data?')) return;
        setError('');
        try {
            await deleteProjectMutation.mutateAsync(id);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete project');
        }
    };

    return (
        <>
            <Header
                title={activeCompany ? activeCompany.name : 'Projects Repository'}
                subtitle={activeCompany ? 'Repo > Company' : 'Manage your BSA projects and artifacts'}
            />

            <div className="page-content">
                {loading ? (
                    <div className="empty-state">
                        <Loader2 size={32} className="spin" />
                        <h3>Loading projects...</h3>
                    </div>
                ) : visibleError ? (
                    <div className="empty-state">
                        <AlertCircle size={32} style={{ color: 'var(--error)' }} />
                        <h3>{visibleError}</h3>
                    </div>
                ) : (
                    <div className="repo-content">
                        {!activeCompany ? (
                            <div className="empty-state">
                                <Building2 size={32} />
                                <h3>{isUnknownCompanyRoute ? 'Company not found' : 'No company selected'}</h3>
                            </div>
                        ) : null}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
                            <button className="btn-primary" onClick={() => setShowCreate(true)} disabled={!activeCompany}>
                                <Plus size={14} />
                                <span>Add new project</span>
                            </button>
                        </div>

                        <div className="repo-grid">
                            {projects.map(p => (
                                <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
                            ))}
                            {activeCompany && projects.length === 0 && (
                                <div className="repo-card repo-card--add" role="status">
                                    <div className="repo-add-icon">
                                        <FolderOpen size={20} />
                                    </div>
                                    <h4>No projects yet</h4>
                                    <p>Create the first project for this company.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create New Project</h3>
                            <button className="icon-btn-subtle" onClick={() => setShowCreate(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <label className="form-label">Project Name</label>
                        <input type="text" className="form-input" placeholder="e.g. Payment Gateway API"
                            value={newName} onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowCreate(false); }}
                            autoFocus />

                        <label className="form-label" style={{ marginTop: '1rem' }}>Description (optional)</label>
                        <textarea className="form-input" rows={3} placeholder="Brief project description..."
                            value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleCreate} disabled={!newName.trim() || creating}>
                                {creating ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                                <span>Create</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
