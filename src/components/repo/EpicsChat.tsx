import { useState, useRef, useEffect } from 'react';
import {
    MessageSquare, Send, Loader2, X, Save, ChevronRight,
    FileText, Upload, CheckCircle2, Database,
} from 'lucide-react';
import { chatStream } from '../../lib/ai';
import { useUpdateProject, type AnalysisDoc } from '../../lib/hooks/use-repo-api';
import { useResizablePanel } from '../../lib/hooks/use-resizable-panel';

// ── BMAD Epics workflow steps ──────────────────────────
const EPICS_STEPS = [
    { step: 1, name: 'PRD Input', key: 'prd-input' },
    { step: 2, name: 'Extract Requirements', key: 'extract' },
    { step: 3, name: 'Design Epics', key: 'design' },
    { step: 4, name: 'Create Stories', key: 'stories' },
];

const BMAD_SYSTEM = `You are a Product Strategist AI using BMAD methodology.
Your role: Facilitate epic & story creation from PRD requirements.
Quality rules:
- Organize epics by USER VALUE, not technical layers
- Each story must be independently completable
- Stories follow: As a [user_type], I want [capability], So that [value]
- Acceptance Criteria use Given/When/Then format
- Each story sized for single dev agent completion
- Create database tables ONLY when needed by the story
Communication: Vietnamese. Structured, collaborative, professional.`;

// ── Step-specific prompts ──────────────────────────────
const STEP_PROMPTS: Record<string, string> = {
    'extract': `CURRENT STEP: Extract Requirements.
Instructions:
1. Read the entire PRD content provided
2. Extract ALL Functional Requirements (FR1, FR2, ...)
3. Extract ALL Non-Functional Requirements (NFR1, NFR2, ...)
4. Present them in a structured list
5. Ask user to confirm requirements are complete`,

    'design': `CURRENT STEP: Design Epics.
Instructions:
1. Based on the confirmed requirements, propose an epic structure
2. Each epic must be USER-VALUE focused (not technical layers)
3. Format: Epic title + user outcome + FR coverage
4. Present the epic list and FR coverage map
5. Ask user for approval before proceeding`,

    'stories': `CURRENT STEP: Create Stories.
Instructions:
1. For each approved epic, create user stories
2. Each story: As a [user], I want [what], So that [why]
3. Each story must have Given/When/Then acceptance criteria
4. Process epics sequentially - present each one for review
5. After all epics done, present the complete document`,
};

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface PrdSource {
    type: 'project' | 'analysis' | 'free';
    label: string;
    content: string;
    docId?: string;
}

interface EpicsChatProps {
    projectId: string;
    projectName: string;
    prdContent?: string;
    analysisDocs?: AnalysisDoc[];
    onClose: () => void;
    onEpicsSaved: () => void;
}

export function EpicsChat({ projectId, projectName, prdContent, analysisDocs = [], onClose, onEpicsSaved }: EpicsChatProps) {
    const updateProjectMutation = useUpdateProject();
    const { panelStyle, onMouseDown } = useResizablePanel(420, 360, 80);

    // Build PRD sources list
    const prdSources: PrdSource[] = [];
    if (prdContent) {
        prdSources.push({ type: 'project', label: `Project PRD (${prdContent.length.toLocaleString()} chars)`, content: prdContent });
    }
    analysisDocs.forEach(doc => {
        if (doc.content) {
            prdSources.push({ type: 'analysis', label: `${doc.title} (${doc.content.length.toLocaleString()} chars)`, content: doc.content, docId: doc.id });
        }
    });
    prdSources.push({ type: 'free', label: 'Nhập trực tiếp (Free Input)', content: '' });

    const hasAutoSource = prdSources.length > 1; // has at least one PRD + free input
    const [selectedSource, setSelectedSource] = useState<number | null>(() => {
        if (prdSources.length === 1) return null; // only free input
        return 0; // auto-select first PRD
    });

    const effectivePrd = selectedSource !== null && prdSources[selectedSource]?.type !== 'free'
        ? prdSources[selectedSource]?.content || ''
        : '';

    const [currentStep, setCurrentStep] = useState(() => effectivePrd ? 2 : 1);
    const [prdInput, setPrdInput] = useState(effectivePrd);
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        if (effectivePrd) {
            return [{
                role: 'assistant', content:
                    `Xin chào! Tôi sẽ giúp bạn tạo **Epics & Stories** cho project **"${projectName}"** theo phương pháp BMAD.\n\n` +
                    `✅ **PRD đã được tải** (${effectivePrd.length.toLocaleString()} ký tự)\n\n` +
                    `Bắt đầu **Bước 2: Extract Requirements** — Tôi sẽ phân tích PRD và trích xuất các yêu cầu.\n\n` +
                    `Nhấn **Send** hoặc gõ bất kỳ ghi chú nào để bắt đầu.`
            }];
        }
        return [{
            role: 'assistant', content:
                `Xin chào! Tôi sẽ giúp bạn tạo **Epics & Stories** cho project **"${projectName}"** theo BMAD.\n\n` +
                `**Bước 1: PRD Input**\n\n` +
                (hasAutoSource
                    ? `Chọn nguồn PRD bên dưới, hoặc nhập trực tiếp.\n`
                    : `Bạn có thể:\n1. Paste nội dung PRD vào khung bên dưới\n2. Hoặc nhấn **[C]** nếu bạn muốn bỏ qua và tự mô tả yêu cầu\n`) +
                `\nHãy cung cấp PRD hoặc mô tả sản phẩm của bạn.`
        }];
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [compiledEpics, setCompiledEpics] = useState('');
    const [saving, setSaving] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Auto-extract requirements if PRD was preloaded
    useEffect(() => {
        if (effectivePrd && currentStep === 2 && messages.length === 1) {
            autoExtract();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectPrdSource = (idx: number) => {
        setSelectedSource(idx);
        const source = prdSources[idx];
        if (source.type !== 'free' && source.content) {
            setPrdInput(source.content);
            setCurrentStep(2);
            setMessages([{
                role: 'assistant', content:
                    `✅ **PRD đã được tải:** ${source.label}\n\n` +
                    `Bắt đầu **Bước 2: Extract Requirements**.\n\nNhấn **Send** để bắt đầu phân tích.`
            }]);
        }
    };

    const autoExtract = async () => {
        setLoading(true);
        const prompt = `Project: ${projectName}\n\n${STEP_PROMPTS['extract']}\n\nPRD Content:\n${prdInput}\n\nExtract all FRs and NFRs from this PRD. Present in structured format. Respond in Vietnamese.`;

        let response = '';
        await chatStream(
            [{ role: 'user', content: `${BMAD_SYSTEM}\n\n${prompt}` }],
            (chunk) => {
                response += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    if (updated.length > 1 && updated[updated.length - 1].role === 'assistant') {
                        updated[updated.length - 1] = { role: 'assistant', content: response };
                    } else {
                        updated.push({ role: 'assistant', content: response });
                    }
                    return updated;
                });
            },
            () => {
                setLoading(false);
            }
        );
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');

        // Step 1: If user pastes PRD text
        if (currentStep === 1 && !prdInput && userMsg.length > 100) {
            setPrdInput(userMsg);
        }

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMsg }];
        setMessages(newMessages);
        setLoading(true);

        const conversation = newMessages.slice(-10).map(m =>
            `${m.role === 'user' ? 'User' : 'BMAD PM'}: ${m.content}`
        ).join('\n\n');

        const stepKey = EPICS_STEPS[currentStep - 1]?.key || 'stories';
        const stepPrompt = STEP_PROMPTS[stepKey] || '';
        const prdContext = prdInput ? `\n\nPRD Content (reference):\n${prdInput.slice(0, 8000)}` : '';

        const prompt = `Project: ${projectName}\nCurrent Step: ${EPICS_STEPS[currentStep - 1]?.name || 'Finalization'} (Step ${currentStep}/4)\n\n${stepPrompt}${prdContext}\n\nConversation:\n${conversation}\n\nRespond to user's latest message. Continue facilitating the current step. Respond in Vietnamese.`;

        let response = '';
        await chatStream(
            [{ role: 'user', content: `${BMAD_SYSTEM}\n\n${prompt}` }],
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
        if (currentStep < 4) {
            if (currentStep === 1 && !prdInput) {
                const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                if (lastUserMsg && lastUserMsg.content.length > 50) {
                    setPrdInput(lastUserMsg.content);
                }
            }

            const next = currentStep + 1;
            setCurrentStep(next);
            const step = EPICS_STEPS[next - 1];
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `✅ Chuyển sang bước tiếp theo:\n\n**Bước ${step.step}: ${step.name}**\n\nHãy cung cấp thông tin hoặc nhấn **Send** để tôi tiếp tục.`
            }]);
        } else {
            compileEpics();
        }
    };

    const compileEpics = async () => {
        setLoading(true);
        const conversation = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        const prompt = `Based on our entire conversation, compile a COMPLETE Epics & Stories document in Markdown following this exact structure:

# ${projectName} - Epic Breakdown

## Overview
[Brief overview]

## Requirements Inventory

### Functional Requirements
[List all FRs]

### Non-Functional Requirements
[List all NFRs]

### FR Coverage Map
[Map FRs to epics]

## Epic List
[Summary of all epics]

## Epic 1: [Title]
[Epic goal]
### Story 1.1: [Title]
As a [user], I want [capability], So that [value].
**Acceptance Criteria:**
**Given** [precondition]
**When** [action]
**Then** [expected_outcome]

[Continue for all epics and stories]

Fill with all information from our conversation. Output ONLY markdown. Respond in Vietnamese.

Conversation:
${conversation}`;

        let result = '';
        await chatStream(
            [{ role: 'user', content: `${BMAD_SYSTEM}\n\n${prompt}` }],
            (chunk) => { result += chunk; setCompiledEpics(result); },
            () => { setLoading(false); setCompiledEpics(result); }
        );
    };

    const saveEpics = async () => {
        if (!compiledEpics) return;
        setSaving(true);
        try {
            await updateProjectMutation.mutateAsync({
                id: projectId,
                data: { epics_content: compiledEpics },
            });
            onEpicsSaved();
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="prd-chat-panel" style={panelStyle}>
            {/* Resize handle */}
            <div className="chat-panel-resize-handle" onMouseDown={onMouseDown} />

            {/* Header */}
            <div className="prd-chat-header">
                <MessageSquare size={18} style={{ color: 'var(--accent)' }} />
                <span className="prd-chat-title">
                    Epics & Stories — Step {currentStep}/4: {EPICS_STEPS[currentStep - 1]?.name || 'Done'}
                </span>
                <button className="icon-btn-subtle" onClick={onClose}><X size={16} /></button>
            </div>

            {/* Step indicators */}
            <div className="prd-chat-steps">
                {EPICS_STEPS.map(s => (
                    <div key={s.step}
                        className={`prd-step ${s.step === currentStep ? 'active' : ''} ${s.step < currentStep ? 'done' : ''}`}>
                        {s.step < currentStep ? <CheckCircle2 size={12} /> : s.step}
                    </div>
                ))}
            </div>

            {/* PRD loaded banner (step 2+) */}
            {prdInput && currentStep >= 2 && (
                <div className="epics-prd-banner">
                    <FileText size={14} />
                    <span>PRD loaded — {prdInput.length.toLocaleString()} chars</span>
                </div>
            )}

            {/* Messages */}
            <div className="prd-chat-messages">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.role}`}>
                        <div className="chat-bubble">{msg.content}</div>
                    </div>
                ))}
                {loading && !compiledEpics && (
                    <div className="chat-msg assistant">
                        <div className="chat-bubble"><Loader2 size={14} className="spin" /> Đang phân tích...</div>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            {/* Compiled Epics preview */}
            {compiledEpics && (
                <div className="prd-compiled">
                    <div className="prd-compiled-header">
                        <span>📋 Epics & Stories Compiled</span>
                        <button className="btn-primary" onClick={saveEpics} disabled={saving}
                            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                            <span>Save Epics</span>
                        </button>
                    </div>
                    <pre className="prd-compiled-content">{compiledEpics}</pre>
                </div>
            )}

            {/* Step 1: PRD source picker */}
            {currentStep === 1 && (
                <div className="epics-prd-input">
                    {/* Source picker cards (only if multiple sources) */}
                    {hasAutoSource && (
                        <>
                            <div className="epics-prd-input-header">
                                <Database size={14} />
                                <span>Chọn nguồn PRD</span>
                            </div>
                            <div className="epics-source-list">
                                {prdSources.map((src, idx) => (
                                    <button
                                        key={idx}
                                        className={`epics-source-btn ${selectedSource === idx ? 'active' : ''}`}
                                        onClick={() => selectPrdSource(idx)}
                                    >
                                        {src.type === 'project' ? <FileText size={12} /> :
                                            src.type === 'analysis' ? <FileText size={12} /> :
                                                <Upload size={12} />}
                                        <span>{src.label}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Free input textarea (shown when no source or free selected) */}
                    {(!hasAutoSource || (selectedSource !== null && prdSources[selectedSource]?.type === 'free')) && (
                        <>
                            <div className="epics-prd-input-header" style={hasAutoSource ? { marginTop: '0.5rem' } : undefined}>
                                <Upload size={14} />
                                <span>Paste PRD hoặc mô tả sản phẩm</span>
                            </div>
                            <textarea
                                value={prdInput}
                                onChange={e => setPrdInput(e.target.value)}
                                placeholder="Paste nội dung PRD vào đây, hoặc gõ mô tả sản phẩm..."
                                rows={4}
                                className="epics-prd-textarea"
                            />
                        </>
                    )}
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
                        title={currentStep < 4 ? '[C] Continue to next step' : 'Compile Epics'}>
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
