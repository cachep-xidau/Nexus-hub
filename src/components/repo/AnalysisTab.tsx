import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Lightbulb, TrendingUp, Building2, Wrench, Briefcase,
    Send, Loader2, Trash2, Eye, X, Save, Download, Bot, User,
} from 'lucide-react';
import { chatStream } from '../../lib/ai';
import {
    useAnalysisDocs,
    useCreateAnalysisDoc,
    useDeleteAnalysisDoc,
    type AnalysisDoc,
} from '../../lib/hooks/use-repo-api';

type AnalysisType = 'brainstorm' | 'market-research' | 'domain-research' | 'technical-research' | 'product-brief';

const ANALYSIS_CARDS: { type: AnalysisType; name: string; icon: typeof Lightbulb; desc: string; system: string; greeting: string }[] = [
    {
        type: 'brainstorm', name: 'Brainstorming', icon: Lightbulb, desc: 'Generate & organize ideas',
        system: 'You are a BMAD Brainstorming Facilitator. Guide creative ideation. Use techniques like SCAMPER, Six Thinking Hats, First Principles. Keep user in generative mode. Vietnamese.',
        greeting: `Chào bạn! 🧠 Tôi là **BMAD Brainstorming Facilitator** — sẽ hỗ trợ bạn khám phá ý tưởng bằng các kỹ thuật sáng tạo đa dạng.\n\nPhiên brainstorming tốt nhất khi chúng ta vượt qua những ý tưởng hiển nhiên để đến vùng đất mới. Tôi có **30+ kỹ thuật sáng tạo** sẵn sàng — từ SCAMPER, Six Thinking Hats đến Reverse Brainstorming, Chaos Engineering...\n\n**Hãy bắt đầu:**\n1. **Chủ đề / vấn đề** bạn muốn brainstorm là gì?\n2. **Mục tiêu cụ thể** — bạn muốn đạt được gì từ phiên này?`,
    },
    {
        type: 'market-research', name: 'Market Research', icon: TrendingUp, desc: 'Market size, competition',
        system: 'You are a BMAD Market Research Facilitator. Guide market analysis covering TAM/SAM/SOM, competitors, customer segments, trends. Vietnamese.',
        greeting: `Chào bạn! 📊 Tôi là **BMAD Market Research Facilitator** — chúng ta sẽ cùng nghiên cứu thị trường như hai đồng nghiệp, bạn mang kiến thức domain, tôi mang phương pháp nghiên cứu.\n\n**Hãy bắt đầu với:**\n1. **Thị trường / ngành** bạn muốn nghiên cứu?\n2. **Mục tiêu** nghiên cứu (đánh giá cơ hội, phân tích đối thủ, sizing)?\n3. **Phạm vi** — toàn cầu, khu vực, hay quốc gia cụ thể?\n\nVí dụ: "Thị trường fintech tại Việt Nam", "E-commerce B2B tại SEA"`,
    },
    {
        type: 'domain-research', name: 'Domain Research', icon: Building2, desc: 'Industry deep-dive',
        system: 'You are a BMAD Domain Research Facilitator. Guide domain analysis: fundamentals, competitive landscape, regulations, technology trends. Vietnamese.',
        greeting: `Chào bạn! 🏭 Tôi là **BMAD Domain Research Facilitator** — sẽ giúp bạn deep-dive vào lĩnh vực mục tiêu với phương pháp nghiên cứu có cấu trúc.\n\n**Hãy bắt đầu với:**\n1. **Lĩnh vực / ngành** cần nghiên cứu sâu?\n2. **Mục tiêu** — hiểu thuật ngữ, quy trình, quy định, hay best practices?\n3. **Mức độ hiểu biết** hiện tại về domain này?\n\nVí dụ: "Healthcare SaaS", "Supply Chain Logistics", "EdTech K-12"`,
    },
    {
        type: 'technical-research', name: 'Technical Research', icon: Wrench, desc: 'Architecture & tech stack',
        system: 'You are a BMAD Technical Research Facilitator. Guide tech evaluation: architecture options, integration patterns, implementation strategy. Use decision matrices. Vietnamese.',
        greeting: `Chào bạn! 🏗️ Tôi là **BMAD Technical Research Facilitator** — sẽ giúp bạn đánh giá các lựa chọn kỹ thuật và đưa ra quyết định kiến trúc dựa trên evidence.\n\n**Hãy bắt đầu với:**\n1. **Chủ đề kỹ thuật** cần nghiên cứu?\n2. **Bài toán** cần giải quyết?\n3. **Constraints** — ràng buộc (budget, team size, timeline)?\n\nVí dụ: "Chọn database cho real-time analytics", "Kiến trúc microservices vs monolith"`,
    },
    {
        type: 'product-brief', name: 'Product Brief', icon: Briefcase, desc: 'Vision, users, features',
        system: 'You are a BMAD Product Brief Facilitator. Guide co-creation: vision, personas, core features (P0/P1/P2), success metrics, constraints. Vietnamese.',
        greeting: `Chào bạn! 📝 Tôi là **BMAD Product Brief Facilitator** — chúng ta sẽ cùng xây dựng product brief như hai đồng nghiệp: bạn mang kiến thức domain, tôi mang structured thinking.\n\n**Hãy bắt đầu với WHY trước WHAT:**\n1. **Product Vision** — tầm nhìn sản phẩm?\n2. **Problem Statement** — vấn đề cần giải quyết?\n3. **Target Users** — người dùng mục tiêu?\n4. **Value Proposition** — giá trị cốt lõi?`,
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
    const [activeChat, setActiveChat] = useState<AnalysisType | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<AnalysisDoc | null>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const docsQuery = useAnalysisDocs(projectId);
    const createDocMutation = useCreateAnalysisDoc();
    const deleteDocMutation = useDeleteAnalysisDoc();

    const docs = docsQuery.data ?? [];

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const startSession = (type: AnalysisType) => {
        const card = ANALYSIS_CARDS.find(c => c.type === type)!;
        setActiveChat(type);
        setMessages([{
            role: 'assistant',
            content: card.greeting,
        }]);
        setTimeout(() => inputRef.current?.focus(), 200);
    };

    const closeSlider = () => {
        setActiveChat(null);
        setMessages([]);
        setInput('');
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
                setTimeout(() => inputRef.current?.focus(), 100);
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
                await createDocMutation.mutateAsync({
                    projectId,
                    type: activeChat!,
                    title: `${card.name} — ${projectName}`,
                    content: result,
                    status: 'completed',
                });
                closeSlider();
                setLoading(false);
            }
        );
    };

    const handleDelete = async (id: string) => {
        await deleteDocMutation.mutateAsync(id);
        if (previewDoc?.id === id) setPreviewDoc(null);
    };

    const activeCard = activeChat ? ANALYSIS_CARDS.find(c => c.type === activeChat) : null;

    return (
        <div className="analysis-tab">
            {/* Tab Header */}
            <div className="tab-header">
                <h2 className="tab-header-title">Analysis</h2>
                <p className="tab-header-subtitle">Phase 1 — Brainstorming & Research</p>
            </div>

            {/* Analysis type cards — no "Start New Analysis" heading */}
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

            {/* ── Analysis Slider (portaled to body to escape overflow:hidden) ── */}
            {activeChat && activeCard && createPortal(
                <div className="analysis-slider-overlay" onClick={closeSlider}>
                    <div className="analysis-slider-panel" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="analysis-slider-header">
                            <div className="analysis-slider-header-left">
                                <div className="analysis-slider-header-icon">
                                    <activeCard.icon size={20} />
                                </div>
                                <div>
                                    <h2 className="analysis-slider-title">AI {activeCard.name}</h2>
                                    <p className="analysis-slider-subtitle">{projectName}</p>
                                </div>
                            </div>
                            <div className="analysis-slider-header-actions">
                                <button
                                    className="analysis-slider-action-btn"
                                    onClick={compileAndSave}
                                    disabled={loading || messages.length < 2}
                                >
                                    <Save size={14} /> Compile
                                </button>
                                <button className="analysis-slider-close" onClick={closeSlider} aria-label="Close">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="analysis-slider-messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`analysis-slider-bubble ${msg.role}`}>
                                    <div className={`analysis-slider-avatar ${msg.role}`}>
                                        {msg.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
                                    </div>
                                    <div className="analysis-slider-bubble-wrap">
                                        <span className="analysis-slider-bubble-label">
                                            {msg.role === 'assistant' ? 'AI Assistant' : 'You'}
                                        </span>
                                        <div className={`analysis-slider-bubble-content ${msg.role}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="analysis-slider-bubble assistant">
                                    <div className="analysis-slider-avatar assistant"><Bot size={18} /></div>
                                    <div className="analysis-slider-bubble-wrap">
                                        <span className="analysis-slider-bubble-label">AI Assistant</span>
                                        <div className="analysis-slider-bubble-content assistant">
                                            <Loader2 size={14} className="spin" /> Đang suy nghĩ...
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={endRef} />
                        </div>

                        {/* Input */}
                        <div className="analysis-slider-input-area">
                            <div className="analysis-slider-input-wrap">
                                <textarea
                                    ref={inputRef}
                                    className="analysis-slider-textarea"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    placeholder="Nhập tin nhắn..."
                                    rows={3}
                                    disabled={loading}
                                />
                                <div className="analysis-slider-input-footer">
                                    <span className="analysis-slider-input-hint">AI can make mistakes. Verify critical requirements.</span>
                                    <button
                                        className="analysis-slider-send"
                                        onClick={sendMessage}
                                        disabled={!input.trim() || loading}
                                        aria-label="Send"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
