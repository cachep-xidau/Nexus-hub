import { useState, useRef, useEffect } from 'react';
import {
    Lightbulb, TrendingUp, Building2, Wrench, Briefcase,
    Send, Loader2, Trash2, Eye, X, Save, Download,
} from 'lucide-react';
import { chatStream } from '../../lib/ai';
import {
    getAnalysisDocs, createAnalysisDoc, updateAnalysisDoc, deleteAnalysisDoc,
    type AnalysisDoc,
} from '../../lib/repo-db';

type AnalysisType = 'brainstorm' | 'market-research' | 'domain-research' | 'technical-research' | 'product-brief';

const ANALYSIS_CARDS: { type: AnalysisType; name: string; icon: typeof Lightbulb; desc: string; system: string }[] = [
    {
        type: 'brainstorm', name: 'Brainstorming', icon: Lightbulb, desc: 'Generate & organize ideas',
        system: 'You are a BMAD Brainstorming Facilitator. Guide creative ideation. Use techniques like SCAMPER, Six Thinking Hats, First Principles. Keep user in generative mode. Vietnamese.',
    },
    {
        type: 'market-research', name: 'Market Research', icon: TrendingUp, desc: 'Market size, competition',
        system: 'You are a BMAD Market Research Facilitator. Guide market analysis covering TAM/SAM/SOM, competitors, customer segments, trends. Vietnamese.',
    },
    {
        type: 'domain-research', name: 'Domain Research', icon: Building2, desc: 'Industry deep-dive',
        system: 'You are a BMAD Domain Research Facilitator. Guide domain analysis: fundamentals, competitive landscape, regulations, technology trends. Vietnamese.',
    },
    {
        type: 'technical-research', name: 'Technical Research', icon: Wrench, desc: 'Architecture & tech stack',
        system: 'You are a BMAD Technical Research Facilitator. Guide tech evaluation: architecture options, integration patterns, implementation strategy. Use decision matrices. Vietnamese.',
    },
    {
        type: 'product-brief', name: 'Product Brief', icon: Briefcase, desc: 'Vision, users, features',
        system: 'You are a BMAD Product Brief Facilitator. Guide co-creation: vision, personas, core features (P0/P1/P2), success metrics, constraints. Vietnamese.',
    },
];

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface AnalysisTabProps {
    projectId: string;
    projectName: string;
}

export function AnalysisTab({ projectId, projectName }: AnalysisTabProps) {
    const [docs, setDocs] = useState<AnalysisDoc[]>([]);
    const [activeChat, setActiveChat] = useState<AnalysisType | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<AnalysisDoc | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadDocs(); }, [projectId]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const loadDocs = async () => {
        const d = await getAnalysisDocs(projectId);
        setDocs(d);
    };

    const startSession = (type: AnalysisType) => {
        const card = ANALYSIS_CARDS.find(c => c.type === type)!;
        setActiveChat(type);
        setMessages([{
            role: 'assistant',
            content: `Chào bạn! Tôi sẽ hướng dẫn bạn thực hiện **${card.name}** cho project **"${projectName}"**.\n\nHãy bắt đầu — bạn muốn khám phá gì?`
        }]);
    };

    const sendMessage = async () => {
        if (!input.trim() || loading || !activeChat) return;
        const userMsg = input.trim();
        setInput('');

        const card = ANALYSIS_CARDS.find(c => c.type === activeChat)!;
        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setLoading(true);

        const conversation = newMessages.map(m =>
            `${m.role === 'user' ? 'User' : 'Analyst'}: ${m.content}`
        ).join('\n\n');

        const prompt = `${card.name} session for project "${projectName}".\n\nConversation:\n${conversation}\n\nRespond naturally. Be helpful, structured. Ask follow-ups when appropriate. Vietnamese.`;

        let response = '';
        await chatStream(
            [{ role: 'user', content: `${card.system}\n\n${prompt}` }],
            (chunk) => {
                response += chunk;
                setMessages([...newMessages, { role: 'assistant', content: response }]);
            },
            () => {
                setLoading(false);
                setMessages([...newMessages, { role: 'assistant', content: response }]);
            }
        );
    };

    const compileAndSave = async () => {
        if (!activeChat || messages.length < 2) return;
        setLoading(true);
        const card = ANALYSIS_CARDS.find(c => c.type === activeChat)!;
        const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');

        const prompt = `Compile a comprehensive ${card.name} report from our conversation.\n\nProject: ${projectName}\n\n# ${card.name} Report — ${projectName}\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n\n## Key Findings\n## Recommendations\n## Next Steps\n\nFill with conversation info. Output ONLY markdown.\n\nConversation:\n${conversation}`;

        let result = '';
        await chatStream(
            [{ role: 'user', content: `${card.system}\n\n${prompt}` }],
            (chunk) => { result += chunk; },
            async () => {
                await createAnalysisDoc(projectId, {
                    type: activeChat!,
                    title: `${card.name} — ${projectName}`,
                    content: result,
                    status: 'completed',
                });
                await loadDocs();
                setActiveChat(null);
                setMessages([]);
                setLoading(false);
            }
        );
    };

    const handleDelete = async (id: string) => {
        await deleteAnalysisDoc(id);
        await loadDocs();
        if (previewDoc?.id === id) setPreviewDoc(null);
    };

    // Active chat view
    if (activeChat) {
        const card = ANALYSIS_CARDS.find(c => c.type === activeChat)!;
        return (
            <div className="analysis-chat">
                <div className="analysis-chat-header">
                    <card.icon size={18} style={{ color: 'var(--accent)' }} />
                    <span>{card.name}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                        <button className="btn-secondary" onClick={compileAndSave} disabled={loading || messages.length < 2}
                            style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                            <Save size={14} /> Compile & Save
                        </button>
                        <button className="icon-btn-subtle" onClick={() => { setActiveChat(null); setMessages([]); }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="prd-chat-messages">
                    {messages.map((msg, i) => (
                        <div key={i} className={`chat-msg ${msg.role}`}>
                            <div className="chat-bubble">{msg.content}</div>
                        </div>
                    ))}
                    {loading && (
                        <div className="chat-msg assistant">
                            <div className="chat-bubble"><Loader2 size={14} className="spin" /> Đang suy nghĩ...</div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                <div className="prd-chat-input">
                    <textarea value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Nhập tin nhắn..." rows={2} disabled={loading} />
                    <button className="btn-primary" onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                        <Send size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="analysis-tab">
            {/* Tab Header */}
            <div className="tab-header">
                <h2 className="tab-header-title">Analysis</h2>
                <p className="tab-header-subtitle">Phase 1 — Brainstorming & Research</p>
            </div>

            {/* Analysis type cards */}
            <h3 className="repo-section-title">Start New Analysis</h3>
            <div className="analysis-cards-grid">
                {ANALYSIS_CARDS.map(card => (
                    <button key={card.type} className="analysis-card" onClick={() => startSession(card.type)}>
                        <card.icon size={24} />
                        <div>
                            <div className="analysis-card-name">{card.name}</div>
                            <div className="analysis-card-desc">{card.desc}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Existing documents */}
            {docs.length > 0 && (
                <>
                    <h3 className="repo-section-title" style={{ marginTop: '1.5rem' }}>Saved Documents</h3>
                    <div className="analysis-docs">
                        {docs.map(doc => (
                            <div key={doc.id} className="analysis-doc-item">
                                <div className="analysis-doc-info">
                                    <span className="analysis-doc-type">{doc.type}</span>
                                    <span className="analysis-doc-title">{doc.title}</span>
                                </div>
                                <div className="analysis-doc-actions">
                                    <button className="icon-btn-subtle" onClick={() => setPreviewDoc(doc)}><Eye size={14} /></button>
                                    <button className="icon-btn-subtle" title="Download" onClick={() => {
                                        const blob = new Blob([doc.content || ''], { type: 'text/markdown' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a'); a.href = url;
                                        a.download = `${doc.title.replace(/\s+/g, '_')}.md`;
                                        a.click(); URL.revokeObjectURL(url);
                                    }}><Download size={14} /></button>
                                    <button className="icon-btn-subtle" onClick={() => handleDelete(doc.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Preview panel */}
            {previewDoc && (
                <div className="analysis-preview">
                    <div className="analysis-preview-header">
                        <h4>{previewDoc.title}</h4>
                        <button className="icon-btn-subtle" onClick={() => setPreviewDoc(null)}><X size={16} /></button>
                    </div>
                    <div className="analysis-preview-content">
                        <pre>{previewDoc.content || 'No content'}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}
