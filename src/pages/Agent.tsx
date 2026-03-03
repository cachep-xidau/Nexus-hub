import { useState, useRef, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { chatStream, detectProvider } from '../lib/ai';

interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: Date;
}

export function Agent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Detect provider on mount
  useEffect(() => {
    detectProvider();
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const assistantMsgId = `msg-${Date.now()}-assistant`;
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() }]);

    const chatMessages = [...messages, userMsg]
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({ role: m.role, content: m.content }));

    await chatStream(
      chatMessages,
      (chunk) => {
        setMessages((prev) => prev.map((m) =>
          m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
        ));
      },
      () => setIsLoading(false)
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const insertCommand = (cmd: string) => {
    setInput(cmd + ' ');
  };

  const showCommands = messages.length === 0;

  return (
    <>
      <Header title="AI Agent" subtitle="Chat with Nexus to manage your workflow" />
      <div className="chat-container">
        <div className="chat-messages">
          {/* BMAD Commands — shown when no messages */}
          {showCommands && (
            <div className="bmad-commands-panel animate-fade-in">
              <div className="bmad-commands-header">
                <Bot size={20} />
                <div>
                  <h3>BMAD Method Commands</h3>
                  <p>Click a command to start, or type freely below</p>
                </div>
              </div>

              {/* Anytime */}
              <div className="bmad-phase-group">
                <div className="bmad-phase-label">⚡ Anytime</div>
                <div className="bmad-cmd-list">
                  {[
                    { cmd: '/bmad-help', desc: 'Get help or see next steps' },
                    { cmd: '/bmad-brainstorming', desc: 'Expert-guided idea generation' },
                    { cmd: '/bmad-bmm-quick-spec', desc: 'Quick spec for small tasks' },
                    { cmd: '/bmad-bmm-quick-dev', desc: 'Quick dev without full planning' },
                    { cmd: '/bmad-bmm-correct-course', desc: 'Navigate significant changes' },
                    { cmd: '/bmad-bmm-document-project', desc: 'Analyze & document a project' },
                    { cmd: '/bmad-bmm-generate-project-context', desc: 'Scan codebase → project context' },
                  ].map(c => (
                    <button key={c.cmd} className="bmad-cmd-chip" onClick={() => insertCommand(c.cmd)}>
                      <code>{c.cmd}</code>
                      <span>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase 1: Analysis */}
              <div className="bmad-phase-group">
                <div className="bmad-phase-label">🔍 Phase 1 — Analysis</div>
                <div className="bmad-cmd-list">
                  {[
                    { cmd: '/bmad-bmm-create-product-brief', desc: 'Nail down your product idea' },
                    { cmd: '/bmad-bmm-market-research', desc: 'Market & competitive analysis' },
                    { cmd: '/bmad-bmm-domain-research', desc: 'Industry deep dive' },
                    { cmd: '/bmad-bmm-technical-research', desc: 'Tech feasibility & architecture' },
                  ].map(c => (
                    <button key={c.cmd} className="bmad-cmd-chip" onClick={() => insertCommand(c.cmd)}>
                      <code>{c.cmd}</code>
                      <span>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase 2: Planning */}
              <div className="bmad-phase-group">
                <div className="bmad-phase-label">📋 Phase 2 — Planning</div>
                <div className="bmad-cmd-list">
                  {[
                    { cmd: '/bmad-bmm-create-prd', desc: 'Create Product Requirements Doc' },
                    { cmd: '/bmad-bmm-validate-prd', desc: 'Validate PRD quality' },
                    { cmd: '/bmad-bmm-edit-prd', desc: 'Improve existing PRD' },
                    { cmd: '/bmad-bmm-create-ux-design', desc: 'Plan UX design' },
                  ].map(c => (
                    <button key={c.cmd} className="bmad-cmd-chip" onClick={() => insertCommand(c.cmd)}>
                      <code>{c.cmd}</code>
                      <span>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase 3: Solutioning */}
              <div className="bmad-phase-group">
                <div className="bmad-phase-label">🏗️ Phase 3 — Solutioning</div>
                <div className="bmad-cmd-list">
                  {[
                    { cmd: '/bmad-bmm-create-architecture', desc: 'Document technical decisions' },
                    { cmd: '/bmad-bmm-create-epics-and-stories', desc: 'Create epics & stories' },
                    { cmd: '/bmad-bmm-check-implementation-readiness', desc: 'Ensure alignment before dev' },
                  ].map(c => (
                    <button key={c.cmd} className="bmad-cmd-chip" onClick={() => insertCommand(c.cmd)}>
                      <code>{c.cmd}</code>
                      <span>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase 4: Implementation */}
              <div className="bmad-phase-group">
                <div className="bmad-phase-label">🚀 Phase 4 — Implementation</div>
                <div className="bmad-cmd-list">
                  {[
                    { cmd: '/bmad-bmm-sprint-planning', desc: 'Generate sprint plan' },
                    { cmd: '/bmad-bmm-sprint-status', desc: 'Summarize sprint progress' },
                    { cmd: '/bmad-bmm-create-story', desc: 'Prepare story for dev' },
                    { cmd: '/bmad-bmm-dev-story', desc: 'Execute story implementation' },
                    { cmd: '/bmad-bmm-code-review', desc: 'Review implementation' },
                    { cmd: '/bmad-bmm-qa-automate', desc: 'Generate automated tests' },
                    { cmd: '/bmad-bmm-retrospective', desc: 'Review & lessons learned' },
                  ].map(c => (
                    <button key={c.cmd} className="bmad-cmd-chip" onClick={() => insertCommand(c.cmd)}>
                      <code>{c.cmd}</code>
                      <span>{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role} animate-fade-in`}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8, opacity: 0.7 }}>
                {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                <span className="text-sm">{msg.role === 'assistant' ? 'Nexus' : 'You'}</span>
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="chat-message assistant animate-fade-in">
              <div className="flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="chat-input-bar">
          <textarea className="chat-input" placeholder="Type a BMAD command or ask anything... (Enter to send)"
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            rows={1} disabled={isLoading} />
          <button className="btn btn-primary btn-icon" onClick={handleSend}
            disabled={isLoading || !input.trim()} style={{ flexShrink: 0 }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
