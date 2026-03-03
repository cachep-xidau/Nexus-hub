import { useState, useEffect, useCallback } from 'react';
import {
    Monitor, Smartphone, Tablet, Loader2, Play, Square,
    Download, RefreshCw, AlertCircle, CheckCircle2,
} from 'lucide-react';
import {
    generatePrototype, checkNodeInstalled,
    type PrototypeResult,
} from '../../lib/pipeline/prototype-orchestrator';
import { prototypeManager } from '../../lib/prototype-manager';
import { detectProvider } from '../../lib/ai';

interface PrototypePanelProps {
    projectId: string;
    prdContent: string | null | undefined;
}

type DeviceSize = 'mobile' | 'tablet' | 'desktop';

const DEVICE_WIDTHS: Record<DeviceSize, string> = {
    mobile: '430px',
    tablet: '768px',
    desktop: '100%',
};

export function PrototypePanel({ projectId, prdContent }: PrototypePanelProps) {
    const running = prototypeManager.get(projectId);
    const [status, setStatus] = useState<PrototypeResult['status']>(() => (running ? 'running' : 'stopped'));
    const [url, setUrl] = useState<string | null>(() => (running ? `http://localhost:${running.port}` : null));
    const [error, setError] = useState<string | null>(null);
    const [device, setDevice] = useState<DeviceSize>('desktop');
    const [nodeInstalled, setNodeInstalled] = useState<boolean | null>(null);
    const [aiReady, setAiReady] = useState<boolean>(false);

    // Check prerequisites on mount
    useEffect(() => {
        checkNodeInstalled().then(setNodeInstalled);
        detectProvider().then(p => setAiReady(!!p));

        return () => {
            // Cleanup on unmount — stop dev server
            prototypeManager.stop(projectId);
        };
    }, [projectId]);

    const handleGenerate = useCallback(async () => {
        if (!prdContent) {
            setError('No PRD content. Please add PRD content first.');
            return;
        }

        setError(null);
        setStatus('generating');

        const port = prototypeManager.getNextPort();

        const result = await generatePrototype(
            projectId,
            prdContent,
            port,
            (update) => setStatus(update.status),
        );

        if (result.status === 'running' && result.pid && result.url) {
            prototypeManager.register(projectId, port, result.pid);
            setUrl(result.url);
            setStatus('running');
        } else if (result.status === 'error') {
            setError(result.error || 'Unknown error');
            setStatus('error');
        }
    }, [projectId, prdContent]);

    const handleStop = useCallback(async () => {
        await prototypeManager.stop(projectId);
        setStatus('stopped');
        setUrl(null);
    }, [projectId]);

    const handleRegenerate = useCallback(async () => {
        await handleStop();
        handleGenerate();
    }, [handleStop, handleGenerate]);

    const handleExport = useCallback(() => {
        if (!url) return;
        // Open the prototype URL in default browser
        window.open(url, '_blank');
    }, [url]);

    // ── Render: Prerequisites not met ──────────────
    if (nodeInstalled === false) {
        return (
            <div className="prototype-panel">
                <div className="prototype-empty">
                    <AlertCircle size={40} style={{ color: 'var(--warning)' }} />
                    <h3>Node.js Required</h3>
                    <p>To generate prototypes, you need Node.js installed on your machine.</p>
                    <a href="https://nodejs.org" target="_blank" rel="noopener"
                        className="btn btn-primary" style={{ marginTop: '1rem' }}>
                        Download Node.js
                    </a>
                </div>
            </div>
        );
    }

    if (!aiReady) {
        return (
            <div className="prototype-panel">
                <div className="prototype-empty">
                    <AlertCircle size={40} style={{ color: 'var(--warning)' }} />
                    <h3>AI Provider Not Configured</h3>
                    <p>Configure an AI provider in Settings to generate prototypes.</p>
                </div>
            </div>
        );
    }

    // ── Render: Main panel ──────────────────────────
    return (
        <div className="prototype-panel">
            {/* Toolbar */}
            <div className="prototype-toolbar">
                <div className="prototype-toolbar-left">
                    {status === 'stopped' || status === 'error' ? (
                        <button className="btn btn-primary btn-sm" onClick={handleGenerate}
                            disabled={!prdContent}>
                            <Play size={14} />
                            Generate Prototype
                        </button>
                    ) : status === 'running' ? (
                        <>
                            <button className="btn btn-ghost btn-sm" onClick={handleStop}>
                                <Square size={14} />
                                Stop
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={handleRegenerate}>
                                <RefreshCw size={14} />
                                Regenerate
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
                                <Download size={14} />
                                Open in Browser
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-ghost btn-sm" disabled>
                            <Loader2 size={14} className="spin" />
                            {status === 'generating' ? 'AI Generating...' : 'Building...'}
                        </button>
                    )}
                </div>

                {/* Device size selector */}
                <div className="prototype-device-selector">
                    <button
                        className={`device-btn ${device === 'mobile' ? 'active' : ''}`}
                        onClick={() => setDevice('mobile')}
                        title="Mobile (430px)">
                        <Smartphone size={16} />
                    </button>
                    <button
                        className={`device-btn ${device === 'tablet' ? 'active' : ''}`}
                        onClick={() => setDevice('tablet')}
                        title="Tablet (768px)">
                        <Tablet size={16} />
                    </button>
                    <button
                        className={`device-btn ${device === 'desktop' ? 'active' : ''}`}
                        onClick={() => setDevice('desktop')}
                        title="Desktop (100%)">
                        <Monitor size={16} />
                    </button>
                </div>
            </div>

            {/* Preview area */}
            <div className="prototype-preview">
                {status === 'running' && url ? (
                    <div className="prototype-iframe-wrapper"
                        style={{ maxWidth: DEVICE_WIDTHS[device] }}>
                        <iframe
                            src={url}
                            className="prototype-iframe"
                            title="Prototype Preview"
                            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                        />
                    </div>
                ) : status === 'generating' || status === 'building' ? (
                    <div className="prototype-empty">
                        <Loader2 size={40} className="spin" style={{ color: 'var(--accent)' }} />
                        <h3>{status === 'generating' ? 'AI is generating your prototype...' : 'Installing dependencies & starting server...'}</h3>
                        <p>This may take 30-60 seconds.</p>
                    </div>
                ) : status === 'error' ? (
                    <div className="prototype-empty">
                        <AlertCircle size={40} style={{ color: 'var(--danger)' }} />
                        <h3>Generation Failed</h3>
                        <p style={{ maxWidth: '500px', color: 'var(--text-dim)' }}>{error}</p>
                        <button className="btn btn-primary btn-sm" onClick={handleGenerate}
                            style={{ marginTop: '1rem' }}>
                            <RefreshCw size={14} /> Try Again
                        </button>
                    </div>
                ) : (
                    <div className="prototype-empty">
                        <Monitor size={48} style={{ color: 'var(--text-dim)', opacity: 0.4 }} />
                        <h3>Ready to Create Prototype</h3>
                        <p>Click <strong>"Generate Prototype"</strong> to create an interactive React prototype from your PRD.</p>
                        {!prdContent && (
                            <p style={{ color: 'var(--warning)', marginTop: '0.5rem' }}>
                                ⚠ Add PRD content to the PRD tab first.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="prototype-statusbar">
                {status === 'running' && (
                    <>
                        <CheckCircle2 size={12} style={{ color: 'var(--green)' }} />
                        <span>Running on port {prototypeManager.get(projectId)?.port || '...'}</span>
                    </>
                )}
                {(status === 'generating' || status === 'building') && (
                    <>
                        <Loader2 size={12} className="spin" />
                        <span>{status === 'generating' ? 'Generating code...' : 'Building project...'}</span>
                    </>
                )}
                {status === 'stopped' && (
                    <span style={{ color: 'var(--text-dim)' }}>Prototype idle</span>
                )}
                {status === 'error' && (
                    <>
                        <AlertCircle size={12} style={{ color: 'var(--danger)' }} />
                        <span style={{ color: 'var(--danger)' }}>Error occurred</span>
                    </>
                )}
            </div>
        </div>
    );
}
