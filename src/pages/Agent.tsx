import { useState, useRef, useEffect } from 'react';
import { Header } from '../components/layout/Header';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { chatStream, detectProvider } from '../lib/ai';

interface ChatMessage {
  id: string; role: 'user' | 'assistant'; content: string; timestamp: Date;
}

export function Agent() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome', role: 'assistant',
      content: `👋 Hi! I'm **Nexus**, your AI agent. I can help you:\n\n- 📊 **Analyze** messages from Slack, Gmail & Telegram\n- ✅ **Create tasks** from channel messages\n- 📝 **Summarize** your inbox activity\n- 🎯 **Prioritize** and organize work\n\nWhat would you like to do?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [providerLabel, setProviderLabel] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Detect provider on mount
  useEffect(() => {
    detectProvider().then(p => {
      if (p) setProviderLabel(p.label);
    });
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

  return (
    <>
      <Header title="AI Agent" subtitle="Chat with Nexus to manage your workflow" />
      <div className="chat-container">
        <div className="chat-messages">
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
          <textarea className="chat-input" placeholder="Ask Nexus anything... (Enter to send)"
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
