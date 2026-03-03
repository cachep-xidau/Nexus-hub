import { useState, useRef, useEffect } from 'react';
import {
    MessageSquare, Send, Loader2, X, Save, ChevronRight,
} from 'lucide-react';
import { chatStream } from '../../lib/ai';
import { useUpdateProject } from '../../lib/hooks/use-repo-api';

// BMAD PRD steps
const PRD_STEPS = [
    { step: 1, name: 'Executive Summary' },
    { step: 2, name: 'Success Criteria' },
    { step: 3, name: 'Product Scope' },
    { step: 4, name: 'User Journeys' },
    { step: 5, name: 'Functional Requirements' },
    { step: 6, name: 'Non-Functional Requirements' },
];

const BMAD_SYSTEM = `You are a Product Manager AI using BMAD methodology.
Guide the user through creating a comprehensive PRD.
Quality: High density, measurable requirements, clear traceability, markdown format.
Communication: Vietnamese. Concise, structured, professional. One section at a time.`;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface PrdChatProps {
    projectId: string;
    projectName: string;
    existingPrd?: string;
    onClose: () => void;
    onPrdSaved: () => void;
}

export function PrdChat({ projectId, projectName, existingPrd, onClose, onPrdSaved }: PrdChatProps) {
    const updateProjectMutation = useUpdateProject();
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const greeting = existingPrd
            ? `Tôi sẽ giúp bạn **chỉnh sửa PRD** cho project **"${projectName}"**.\n\nMô tả mục tiêu chỉnh sửa của bạn:`
            : `Tôi sẽ giúp bạn tạo **PRD** cho project **"${projectName}"** theo BMAD.\n\nQuy trình gồm **6 phần**:\n${PRD_STEPS.map(s => `${s.step}. ${s.name}`).join('\n')}\n\n${PRD_STEPS[0].name}: Hãy cho tôi biết tên sản phẩm, vấn đề giải quyết, đối tượng mục tiêu.`;
        return [{ role: 'assistant', content: greeting }];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [compiledPrd, setCompiledPrd] = useState('');
    const [saving, setSaving] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setLoading(true);

        // Build prompt with conversation history
        const conversation = newMessages.map(m =>
            `${m.role === 'user' ? 'User' : 'PM'}: ${m.content}`
        ).join('\n\n');

        const stepInfo = PRD_STEPS[currentStep - 1];
        const systemPrompt = BMAD_SYSTEM + (existingPrd ? `\n\nExisting PRD:\n${existingPrd}` : '');
        const prompt = `Project: ${projectName}\nCurrent Section: ${stepInfo?.name || 'Finalization'} (Step ${currentStep}/6)\n\nConversation:\n${conversation}\n\nRespond to user's latest message. Summarize their input, ask follow-ups if incomplete, or confirm and suggest moving to next section. Respond in Vietnamese.`;

        let response = '';
        await chatStream(
            [{ role: 'user', content: `${systemPrompt}\n\n${prompt}` }],
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

    const nextStep = () => {
        if (currentStep < 6) {
            const next = currentStep + 1;
            setCurrentStep(next);
            const step = PRD_STEPS[next - 1];
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ Chuyển sang phần tiếp theo:\n\n**${step.name}**\n\nHãy cung cấp thông tin cho phần này.`
            }]);
        } else {
            compilePrd();
        }
    };

    const compilePrd = async () => {
        setLoading(true);
        const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const prompt = `Based on our entire conversation, compile a complete PRD in Markdown:\n\n# PRD - ${projectName}\n\n## 1. Executive Summary\n## 2. Success Criteria\n## 3. Product Scope\n## 4. User Journeys\n## 5. Functional Requirements\n## 6. Non-Functional Requirements\n\nFill with info from conversation. Output ONLY markdown.\n\nConversation:\n${conversation}`;

        let result = '';
        await chatStream(
            [{ role: 'user', content: `${BMAD_SYSTEM}\n\n${prompt}` }],
            (chunk) => { result += chunk; setCompiledPrd(result); },
            () => { setLoading(false); setCompiledPrd(result); }
        );
    };

    const savePrd = async () => {
        if (!compiledPrd) return;
        setSaving(true);
        try {
            await updateProjectMutation.mutateAsync({
                id: projectId,
                data: { prd_content: compiledPrd },
            });
            onPrdSaved();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="prd-chat-panel">
            {/* Header */}
            <div className="prd-chat-header">
                <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
                <span className="prd-chat-title">
                    PRD Chat — Step {currentStep}/6: {PRD_STEPS[currentStep - 1]?.name || 'Done'}
                </span>
                <button className="icon-btn-subtle" onClick={onClose}><X size={16} /></button>
            </div>

            {/* Step indicators */}
            <div className="prd-chat-steps">
                {PRD_STEPS.map(s => (
                    <div key={s.step}
                        className={`prd-step ${s.step === currentStep ? 'active' : ''} ${s.step < currentStep ? 'done' : ''}`}>
                        {s.step}
                    </div>
                ))}
            </div>

            {/* Messages */}
            <div className="prd-chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.role}`}>
                        <div className="chat-bubble">{msg.content}</div>
                    </div>
                ))}
                {loading && !compiledPrd && (
                    <div className="chat-msg assistant">
                        <div className="chat-bubble"><Loader2 size={14} className="spin" /> Đang suy nghĩ...</div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Compiled PRD preview */}
            {compiledPrd && (
                <div className="prd-compiled">
                    <div className="prd-compiled-header">
                        <span>📝 PRD Compiled</span>
                        <button className="btn-primary" onClick={savePrd} disabled={saving}
                            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                            <span>Save PRD</span>
                        </button>
                    </div>
                    <pre className="prd-compiled-content">{compiledPrd}</pre>
                </div>
            )}

            {/* Input */}
            <div className="prd-chat-input">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    }}
                    placeholder="Nhập tin nhắn..."
                    rows={2}
                    disabled={loading}
                />
                <div className="prd-chat-actions">
                    <button className="icon-btn-subtle" onClick={nextStep} disabled={loading}
                        title="Next step">
                        <ChevronRight size={18} />
                    </button>
                    <button className="btn-primary" onClick={sendMessage}
                        disabled={!input.trim() || loading}
                        style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
}
