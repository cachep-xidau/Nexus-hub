import { useState, useEffect } from 'react';
import {
    X, Sparkles, Loader2, Check, AlertCircle, ChevronDown,
} from 'lucide-react';
import { ARTIFACT_TYPE_OPTIONS, type ArtifactType } from '../../lib/pipeline/templates';
import { runPipeline, type GenerationResult } from '../../lib/pipeline/orchestrator';
import { getProject, getFeatures, type RepoFeature, type RepoProject } from '../../lib/repo-db';
import { detectProvider } from '../../lib/ai';

interface GenerateModalProps {
    projectId: string;
    onClose: () => void;
    onComplete: () => void;
}

export function GenerateModal({ projectId, onClose, onComplete }: GenerateModalProps) {
    const [project, setProject] = useState<RepoProject | null>(null);
    const [features, setFeatures] = useState<RepoFeature[]>([]);
    const [selectedFeature, setSelectedFeature] = useState('');
    const [selectedFunction, setSelectedFunction] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<ArtifactType[]>([]);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentType, setCurrentType] = useState('');
    const [results, setResults] = useState<GenerationResult[]>([]);
    const [error, setError] = useState('');
    const [providerLabel, setProviderLabel] = useState('');

    useEffect(() => {
        load();
    }, [projectId]);

    const load = async () => {
        const p = await getProject(projectId);
        setProject(p);
        const f = await getFeatures(projectId);
        setFeatures(f);
        if (f.length > 0) {
            setSelectedFeature(f[0].id);
            if (f[0].functions?.length) setSelectedFunction(f[0].functions[0].id);
        }
        const prov = await detectProvider();
        setProviderLabel(prov?.label || 'None');
    };

    const currentFunctions = features.find(f => f.id === selectedFeature)?.functions || [];

    const toggleType = (type: ArtifactType) => {
        setSelectedTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const selectAll = () => {
        setSelectedTypes(
            selectedTypes.length === ARTIFACT_TYPE_OPTIONS.length
                ? []
                : ARTIFACT_TYPE_OPTIONS.map(o => o.value)
        );
    };

    const handleGenerate = async () => {
        if (!selectedFunction || selectedTypes.length === 0 || !project?.prd_content) return;
        setGenerating(true);
        setError('');
        setResults([]);

        try {
            const result = await runPipeline(
                selectedFunction,
                projectId,
                selectedTypes,
                project.prd_content,
                (prog, cur) => { setProgress(prog); setCurrentType(cur); }
            );
            setResults(result.artifacts);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const succeeded = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" style={{ maxWidth: '36rem' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3><Sparkles size={18} style={{ color: 'var(--accent)' }} /> Generate Artifacts</h3>
                    <button className="icon-btn-subtle" onClick={onClose}><X size={18} /></button>
                </div>

                {!project?.prd_content ? (
                    <div className="prd-empty" style={{ padding: '2rem' }}>
                        <AlertCircle size={32} style={{ color: 'var(--orange)' }} />
                        <h3>PRD Required</h3>
                        <p>Write or paste your PRD first before generating artifacts.</p>
                    </div>
                ) : results.length > 0 ? (
                    /* Results view */
                    <div className="gen-results">
                        <div className="gen-results-summary">
                            <span className="gen-success">{succeeded} succeeded</span>
                            {failed > 0 && <span className="gen-failed">{failed} failed</span>}
                        </div>
                        {results.map((r, i) => (
                            <div key={i} className={`gen-result-item ${r.status}`}>
                                {r.status === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                <span>{ARTIFACT_TYPE_OPTIONS.find(o => o.value === r.type)?.label || r.type}</span>
                                {r.error && <span className="gen-result-error">{r.error}</span>}
                            </div>
                        ))}
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={onClose}>Close</button>
                            <button className="btn-primary" onClick={() => { onComplete(); onClose(); }}>
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Config view */
                    <>
                        <div className="gen-provider">
                            AI Provider: <strong>{providerLabel}</strong>
                        </div>

                        {/* Scope selector */}
                        <label className="form-label">Feature</label>
                        <select className="form-input" value={selectedFeature}
                            onChange={e => {
                                setSelectedFeature(e.target.value);
                                const fns = features.find(f => f.id === e.target.value)?.functions || [];
                                setSelectedFunction(fns[0]?.id || '');
                            }}>
                            {features.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>

                        <label className="form-label" style={{ marginTop: '0.75rem' }}>Function</label>
                        <select className="form-input" value={selectedFunction}
                            onChange={e => setSelectedFunction(e.target.value)}>
                            {currentFunctions.map(fn => <option key={fn.id} value={fn.id}>{fn.name}</option>)}
                        </select>

                        {features.length === 0 && (
                            <p style={{ color: 'var(--orange)', fontSize: '0.8125rem', margin: '0.5rem 0' }}>
                                ⚠️ Create at least one Feature + Function in the Artifacts tab first.
                            </p>
                        )}

                        {/* Artifact type checkboxes */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                            <label className="form-label" style={{ margin: 0 }}>Artifact Types</label>
                            <button className="icon-btn-subtle" onClick={selectAll}
                                style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                                {selectedTypes.length === ARTIFACT_TYPE_OPTIONS.length ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        <div className="gen-types-grid">
                            {ARTIFACT_TYPE_OPTIONS.map(opt => (
                                <label key={opt.value} className={`gen-type-checkbox ${selectedTypes.includes(opt.value) ? 'checked' : ''}`}>
                                    <input type="checkbox" checked={selectedTypes.includes(opt.value)}
                                        onChange={() => toggleType(opt.value)} />
                                    {opt.label}
                                </label>
                            ))}
                        </div>

                        {/* Progress */}
                        {generating && (
                            <div className="gen-progress">
                                <div className="gen-progress-bar" style={{ width: `${progress}%` }} />
                                <span className="gen-progress-text">
                                    <Loader2 size={14} className="spin" />
                                    Generating {currentType}... {progress}%
                                </span>
                            </div>
                        )}

                        {error && (
                            <p style={{ color: 'var(--error)', fontSize: '0.8125rem', margin: '0.5rem 0' }}>
                                ⚠️ {error}
                            </p>
                        )}

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button className="btn-primary" onClick={handleGenerate}
                                disabled={generating || !selectedFunction || selectedTypes.length === 0}>
                                {generating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                                <span>Generate {selectedTypes.length} artifact{selectedTypes.length !== 1 ? 's' : ''}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
