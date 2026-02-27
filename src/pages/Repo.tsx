import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import {
    FolderOpen, Plus, MoreHorizontal, Loader2, X, Check, AlertCircle,
} from 'lucide-react';
import { getProjects, createProject, deleteProject, type RepoProject } from '../lib/repo-db';

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
    const features = project._count?.features ?? 0;
    const artifacts = project._count?.artifacts ?? 0;
    const connections = project._count?.connections ?? 0;

    return (
        <div className="repo-card" onClick={() => navigate(`/repo/${project.id}`)}>
            {/* Menu */}
            <div className="repo-card-menu">
                <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} className="icon-btn-subtle">
                    <MoreHorizontal size={16} />
                </button>
                {menuOpen && (
                    <div className="repo-card-dropdown" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => navigate(`/repo/${project.id}`)}>Open Project</button>
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

            {/* Footer */}
            <button className="repo-card-btn" onClick={(e) => { e.stopPropagation(); navigate(`/repo/${project.id}`); }}>
                Open
            </button>
        </div>
    );
}

export function Repo() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<RepoProject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [creating, setCreating] = useState(false);

    const loadProjects = async () => {
        try {
            const data = await getProjects();
            setProjects(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadProjects(); }, []);

    const handleCreate = async () => {
        if (!newName.trim() || creating) return;
        setCreating(true);
        try {
            const id = await createProject(newName.trim(), newDesc.trim() || undefined);
            setNewName(''); setNewDesc(''); setShowCreate(false);
            navigate(`/repo/${id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this project and all its data?')) return;
        try {
            await deleteProject(id);
            setProjects((prev) => prev.filter(p => p.id !== id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete project');
        }
    };

    const activeProjects = projects.filter(p => (p._count?.artifacts ?? 0) >= 1);
    const newProjects = projects.filter(p => (p._count?.artifacts ?? 0) === 0);

    return (
        <>
            <Header title="Projects Repository" subtitle="Manage your BSA projects and artifacts"
                addLabel="New Project" onAdd={() => setShowCreate(true)} />

            <div className="page-content">
                {loading ? (
                    <div className="empty-state">
                        <Loader2 size={32} className="spin" />
                        <h3>Loading projects...</h3>
                    </div>
                ) : error ? (
                    <div className="empty-state">
                        <AlertCircle size={32} style={{ color: 'var(--error)' }} />
                        <h3>{error}</h3>
                    </div>
                ) : (
                    <div className="repo-content">
                        {/* Active Projects */}
                        {activeProjects.length > 0 && (
                            <div className="repo-section">
                                <h3 className="repo-section-title">Active Projects</h3>
                                <div className="repo-grid">
                                    {activeProjects.map(p => (
                                        <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* New / All Projects */}
                        <div className="repo-section">
                            <h3 className="repo-section-title">
                                {activeProjects.length > 0 ? 'New Projects' : 'All Projects'}
                            </h3>
                            <div className="repo-grid">
                                {newProjects.map(p => (
                                    <ProjectCard key={p.id} project={p} onDelete={handleDelete} />
                                ))}

                                {/* Add New Card */}
                                <div className="repo-card repo-card--add" onClick={() => setShowCreate(true)}>
                                    <div className="repo-add-icon">
                                        <Plus size={24} />
                                    </div>
                                    <h4>Start New Analysis</h4>
                                    <p>Create a BSA project with AI-powered artifact generation</p>
                                </div>
                            </div>
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
