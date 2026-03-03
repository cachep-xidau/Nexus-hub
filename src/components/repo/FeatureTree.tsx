import { useState } from 'react';
import {
    ChevronRight, ChevronDown, Plus, Pencil, Trash2, Check, X,
    Loader2, FolderOpen, Box, FileCode, Sparkles,
} from 'lucide-react';
import {
    useCreateFeature,
    useUpdateFeature,
    useDeleteFeature,
    useCreateFunction,
    useUpdateFunction,
    useDeleteFunction,
    type RepoFeature,
} from '../../lib/hooks/use-repo-api';

interface FeatureTreeProps {
    projectId: string;
    features: RepoFeature[];
    onGenerate?: (functionId: string) => void;
}

export function FeatureTree({ projectId, features, onGenerate }: FeatureTreeProps) {
    const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
    const [addingFeature, setAddingFeature] = useState(false);
    const [newFeatureName, setNewFeatureName] = useState('');
    const [addingFuncTo, setAddingFuncTo] = useState<string | null>(null);
    const [newFuncName, setNewFuncName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [saving, setSaving] = useState(false);

    const createFeatureMutation = useCreateFeature();
    const updateFeatureMutation = useUpdateFeature();
    const deleteFeatureMutation = useDeleteFeature();
    const createFunctionMutation = useCreateFunction();
    const updateFunctionMutation = useUpdateFunction();
    const deleteFunctionMutation = useDeleteFunction();

    const toggle = (id: string) => {
        setExpandedFeatures(prev => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id);
            else s.add(id);
            return s;
        });
    };

    const handleAddFeature = async () => {
        if (!newFeatureName.trim() || saving) return;
        setSaving(true);
        try {
            await createFeatureMutation.mutateAsync({
                projectId,
                name: newFeatureName.trim(),
            });
            setNewFeatureName('');
            setAddingFeature(false);
        } finally {
            setSaving(false);
        }
    };

    const handleAddFunction = async (featureId: string) => {
        if (!newFuncName.trim() || saving) return;
        setSaving(true);
        try {
            await createFunctionMutation.mutateAsync({
                featureId,
                name: newFuncName.trim(),
            });
            setNewFuncName('');
            setAddingFuncTo(null);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async (id: string, type: 'feature' | 'function') => {
        if (!editName.trim() || saving) return;
        setSaving(true);
        try {
            if (type === 'feature') {
                await updateFeatureMutation.mutateAsync({ id, data: { name: editName.trim() } });
            } else {
                await updateFunctionMutation.mutateAsync({ id, data: { name: editName.trim() } });
            }
            setEditingId(null);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, type: 'feature' | 'function') => {
        if (saving) return;
        setSaving(true);
        try {
            if (type === 'feature') {
                await deleteFeatureMutation.mutateAsync(id);
            } else {
                await deleteFunctionMutation.mutateAsync(id);
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="feature-tree">
            <div className="feature-tree-header">
                <h3 className="repo-section-title" style={{ margin: 0 }}>Feature Tree</h3>
                <button className="icon-btn-subtle" onClick={() => setAddingFeature(true)} title="Add Feature">
                    <Plus size={16} />
                </button>
            </div>

            {features.length === 0 && !addingFeature && (
                <div className="feature-tree-empty">
                    <FolderOpen size={32} style={{ color: 'var(--text-dim)' }} />
                    <p>No features yet. Click + to add one.</p>
                </div>
            )}

            {features.map(feature => (
                <div key={feature.id} className="feature-node">
                    {/* Feature header */}
                    <div className="feature-row" onClick={() => toggle(feature.id)}>
                        {expandedFeatures.has(feature.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <FolderOpen size={16} className="feature-icon" />
                        {editingId === feature.id ? (
                            <div className="inline-edit" onClick={e => e.stopPropagation()}>
                                <input className="inline-edit-input" value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleEdit(feature.id, 'feature'); }}
                                    autoFocus />
                                <button className="icon-btn-subtle" onClick={() => handleEdit(feature.id, 'feature')}>
                                    {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                                </button>
                                <button className="icon-btn-subtle" onClick={() => setEditingId(null)}>
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <>
                                <span className="feature-name">{feature.name}</span>
                                <span className="feature-badge">{feature.functions?.length || 0}</span>
                                <div className="feature-actions" onClick={e => e.stopPropagation()}>
                                    <button className="icon-btn-subtle" onClick={() => {
                                        setEditingId(feature.id); setEditName(feature.name);
                                    }}><Pencil size={13} /></button>
                                    <button className="icon-btn-subtle" onClick={() => {
                                        setAddingFuncTo(feature.id); setNewFuncName('');
                                    }}><Plus size={13} /></button>
                                    <button className="icon-btn-subtle" onClick={() => handleDelete(feature.id, 'feature')}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Functions (children) */}
                    {expandedFeatures.has(feature.id) && (
                        <div className="function-list">
                            {(feature.functions || []).map(fn => (
                                <div key={fn.id} className="function-row">
                                    <Box size={14} className="function-icon" />
                                    {editingId === fn.id ? (
                                        <div className="inline-edit">
                                            <input className="inline-edit-input" value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleEdit(fn.id, 'function'); }}
                                                autoFocus />
                                            <button className="icon-btn-subtle" onClick={() => handleEdit(fn.id, 'function')}>
                                                <Check size={14} />
                                            </button>
                                            <button className="icon-btn-subtle" onClick={() => setEditingId(null)}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="function-name">{fn.name}</span>
                                            {(fn._count?.artifacts || 0) > 0 && (
                                                <span className="artifact-badge">
                                                    <FileCode size={12} /> {fn._count?.artifacts}
                                                </span>
                                            )}
                                            <div className="feature-actions">
                                                {onGenerate && (
                                                    <button className="icon-btn-subtle gen-fn-btn" onClick={() => onGenerate(fn.id)}
                                                        title="Generate artifacts for this function">
                                                        <Sparkles size={12} /> Gen
                                                    </button>
                                                )}
                                                <button className="icon-btn-subtle" onClick={() => {
                                                    setEditingId(fn.id); setEditName(fn.name);
                                                }}><Pencil size={12} /></button>
                                                <button className="icon-btn-subtle" onClick={() => handleDelete(fn.id, 'function')}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}

                            {/* Add function input */}
                            {addingFuncTo === feature.id && (
                                <div className="function-row add-row">
                                    <Plus size={14} />
                                    <input className="inline-edit-input" placeholder="Function name..."
                                        value={newFuncName} onChange={e => setNewFuncName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleAddFunction(feature.id);
                                            if (e.key === 'Escape') setAddingFuncTo(null);
                                        }}
                                        autoFocus />
                                    <button className="icon-btn-subtle" onClick={() => handleAddFunction(feature.id)}>
                                        <Check size={14} />
                                    </button>
                                    <button className="icon-btn-subtle" onClick={() => setAddingFuncTo(null)}>
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Add feature input */}
            {addingFeature && (
                <div className="feature-node">
                    <div className="feature-row add-row">
                        <Plus size={16} />
                        <input className="inline-edit-input" placeholder="Feature name..."
                            value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleAddFeature();
                                if (e.key === 'Escape') setAddingFeature(false);
                            }}
                            autoFocus />
                        <button className="icon-btn-subtle" onClick={handleAddFeature}>
                            {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                        </button>
                        <button className="icon-btn-subtle" onClick={() => setAddingFeature(false)}>
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
