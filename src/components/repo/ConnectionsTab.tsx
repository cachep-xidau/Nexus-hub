import { useState, useEffect } from 'react';
import {
    Plug, Plus, Trash2, RefreshCw, Check, AlertCircle, Loader2,
    Globe, FileText, Figma, Database, X, Link,
} from 'lucide-react';
import {
    getMcpConnections, createMcpConnection, updateMcpConnection, deleteMcpConnection,
    type McpConnection,
} from '../../lib/repo-db';

const MCP_TYPES = [
    { type: 'confluence', name: 'Confluence', icon: FileText, desc: 'Import pages and spaces' },
    { type: 'figma', name: 'Figma', icon: Figma, desc: 'Import design screens' },
    { type: 'notion', name: 'Notion', icon: Database, desc: 'Import databases and pages' },
    { type: 'web', name: 'Web URL', icon: Globe, desc: 'Scrape web content' },
];

const STATUS_COLORS: Record<string, string> = {
    connected: 'var(--green)',
    disconnected: 'var(--text-dim)',
    error: 'var(--error)',
};

interface ConnectionsTabProps {
    projectId: string;
}

export function ConnectionsTab({ projectId }: ConnectionsTabProps) {
    const [connections, setConnections] = useState<McpConnection[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => { load(); }, [projectId]);

    const load = async () => {
        setLoading(true);
        const data = await getMcpConnections(projectId);
        setConnections(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this connection?')) return;
        await deleteMcpConnection(id);
        await load();
    };

    const handleToggle = async (conn: McpConnection) => {
        const newStatus = conn.status === 'connected' ? 'disconnected' : 'connected';
        await updateMcpConnection(conn.id, { status: newStatus });
        await load();
    };

    if (loading) {
        return (
            <div className="empty-state"><Loader2 size={24} className="spin" /></div>
        );
    }

    return (
        <div className="connections-tab">
            {/* Tab Header */}
            <div className="tab-header">
                <h2 className="tab-header-title">Connections</h2>
                <p className="tab-header-subtitle">External Data Sources & MCP Integrations</p>
            </div>

            {/* MCP Instruction */}
            <div className="prd-tip" style={{ marginBottom: 'var(--space-md)' }}>
                <Link size={14} />
                <span>Connect external tools like Figma, Confluence, Notion via <strong>Model Context Protocol</strong>. AI agents use these connections to read designs and docs directly from your sources.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <h3 className="repo-section-title" style={{ margin: 0 }}>Data Connections</h3>
                <button className="btn-primary" onClick={() => setShowModal(true)}
                    style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                    <Plus size={14} /> Add Connection
                </button>
            </div>

            {connections.length === 0 ? (
                <div className="feature-tree-empty" style={{ padding: '3rem' }}>
                    <Plug size={40} style={{ color: 'var(--text-dim)' }} />
                    <h3 style={{ color: 'var(--text-secondary)', margin: 0 }}>No Connections</h3>
                    <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                        Connect external data sources like Confluence, Figma, or Notion to enrich your PRD.
                    </p>
                </div>
            ) : (
                <div className="connections-list">
                    {connections.map(conn => {
                        const typeInfo = MCP_TYPES.find(t => t.type === conn.type);
                        const Icon = typeInfo?.icon || Globe;
                        return (
                            <div key={conn.id} className="connection-item">
                                <div className="connection-icon">
                                    <Icon size={20} />
                                </div>
                                <div className="connection-info">
                                    <div className="connection-name">{conn.name}</div>
                                    <div className="connection-meta">
                                        <span className="connection-type">{typeInfo?.name || conn.type}</span>
                                        <span className="connection-status" style={{ color: STATUS_COLORS[conn.status] || 'var(--text-dim)' }}>
                                            ● {conn.status}
                                        </span>
                                        {conn.tool_count > 0 && (
                                            <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                                                {conn.tool_count} tools
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="connection-actions">
                                    <button className="icon-btn-subtle" onClick={() => handleToggle(conn)}
                                        title={conn.status === 'connected' ? 'Disconnect' : 'Connect'}>
                                        {conn.status === 'connected' ? <Check size={14} style={{ color: 'var(--green)' }} /> : <RefreshCw size={14} />}
                                    </button>
                                    <button className="icon-btn-subtle" onClick={() => handleDelete(conn.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add Connection Modal */}
            {showModal && (
                <ConnectModal projectId={projectId} onClose={() => setShowModal(false)} onCreated={load} />
            )}
        </div>
    );
}

// ── Connect Modal ─────────────────────────────────────
interface ConnectModalProps {
    projectId: string;
    onClose: () => void;
    onCreated: () => void;
}

function ConnectModal({ projectId, onClose, onCreated }: ConnectModalProps) {
    const [selectedType, setSelectedType] = useState('');
    const [name, setName] = useState('');
    const [configUrl, setConfigUrl] = useState('');
    const [configToken, setConfigToken] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async () => {
        if (!selectedType || !name.trim()) return;
        setCreating(true);
        setError('');

        try {
            const config = JSON.stringify({
                url: configUrl,
                token: configToken,
                type: selectedType,
            });

            await createMcpConnection(projectId, name.trim(), selectedType, config);
            onCreated();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create connection');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-panel" style={{ maxWidth: '28rem' }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3><Plug size={18} style={{ color: 'var(--accent)' }} /> Add Connection</h3>
                    <button className="icon-btn-subtle" onClick={onClose}><X size={18} /></button>
                </div>

                {/* Type selection */}
                <label className="form-label">Connection Type</label>
                <div className="connect-type-grid">
                    {MCP_TYPES.map(t => (
                        <button key={t.type}
                            className={`connect-type-card ${selectedType === t.type ? 'selected' : ''}`}
                            onClick={() => { setSelectedType(t.type); if (!name) setName(t.name); }}>
                            <t.icon size={20} />
                            <div>
                                <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{t.name}</div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>{t.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {selectedType && (
                    <>
                        <label className="form-label" style={{ marginTop: '1rem' }}>Connection Name</label>
                        <input className="form-input" value={name} onChange={e => setName(e.target.value)}
                            placeholder="My Confluence" />

                        <label className="form-label" style={{ marginTop: '0.75rem' }}>URL / Endpoint</label>
                        <input className="form-input" value={configUrl} onChange={e => setConfigUrl(e.target.value)}
                            placeholder={selectedType === 'figma' ? 'https://figma.com/file/...' : 'https://...'} />

                        <label className="form-label" style={{ marginTop: '0.75rem' }}>API Token (optional)</label>
                        <input className="form-input" type="password" value={configToken}
                            onChange={e => setConfigToken(e.target.value)}
                            placeholder="API token or access key" />
                    </>
                )}

                {error && (
                    <p style={{ color: 'var(--error)', fontSize: '0.8125rem', margin: '0.5rem 0' }}>
                        ⚠️ {error}
                    </p>
                )}

                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleCreate}
                        disabled={!selectedType || !name.trim() || creating}>
                        {creating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                        <span>Create</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
