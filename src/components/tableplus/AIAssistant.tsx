import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Copy, Lightbulb } from 'lucide-react';
import { generateCompletion } from '../../lib/ai';
import type { ColumnInfo } from '../../lib/tableplus-db';

interface Props {
  tableName: string | null;
  columns: ColumnInfo[];
  onInsertQuery: (sql: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SQL_ASSISTANT_PROMPT = `You are a SQL expert assistant integrated into a database management tool. Help users write, debug, and optimize SQL queries.

When helping:
1. Always provide clean, formatted SQL in code blocks
2. Explain what the query does briefly
3. Warn about destructive operations (DELETE, DROP, TRUNCATE)
4. Suggest indexes for performance if relevant
5. Use the provided schema context to write accurate queries

Be concise and practical. Format SQL with proper indentation.`;

const QUICK_TEMPLATES = [
  { label: 'Select all', sql: 'SELECT * FROM {table} LIMIT 100;' },
  { label: 'Count', sql: 'SELECT COUNT(*) FROM {table};' },
  { label: 'Schema', sql: 'PRAGMA table_info({table});' },
  { label: 'Distinct', sql: 'SELECT DISTINCT {column} FROM {table} LIMIT 50;' },
];

export function AIAssistant({ tableName, columns, onInsertQuery }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSchemaContext = () => {
    if (!tableName || columns.length === 0) return '';
    const cols = columns.map(c =>
      `  ${c.name} ${c.data_type}${c.primary_key ? ' PRIMARY KEY' : ''}${c.nullable ? '' : ' NOT NULL'}`
    ).join('\n');
    return `\n\nCurrent table schema:\nCREATE TABLE ${tableName} (\n${cols}\n);`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const systemPrompt = SQL_ASSISTANT_PROMPT + getSchemaContext();
      const response = await generateCompletion(systemPrompt, userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ Error: ${errMsg}\n\nMake sure AI is configured in Settings.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const insertTemplate = (template: string) => {
    let sql = template.replace(/{table}/g, tableName || 'table');
    if (columns.length > 0) {
      sql = sql.replace(/{column}/g, columns[0].name);
    }
    onInsertQuery(sql);
  };

  const extractSQL = (content: string): string | null => {
    const match = content.match(/```(?:sql)?\s*\n?([\s\S]*?)\n?```/);
    return match ? match[1].trim() : null;
  };

  return (
    <div className="tp-ai-assistant">
      <div className="tp-ai-header">
        <Sparkles size={14} />
        <span>SQL Assistant</span>
        {tableName && <span className="tp-context-table">• {tableName}</span>}
      </div>

      {/* Quick Templates */}
      <div className="tp-ai-templates">
        {QUICK_TEMPLATES.map(t => (
          <button
            key={t.label}
            className="tp-template-btn"
            onClick={() => insertTemplate(t.sql)}
            disabled={!tableName}
          >
            <Lightbulb size={10} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="tp-ai-messages">
        {messages.length === 0 && (
          <div className="tp-ai-welcome">
            <Sparkles size={24} />
            <p>Ask me to help write SQL queries!</p>
            <p className="tp-hint">Try: "Show me all records from last week"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`tp-ai-message ${msg.role}`}>
            {msg.role === 'assistant' && extractSQL(msg.content) && (
              <button
                className="tp-copy-sql-btn"
                onClick={() => onInsertQuery(extractSQL(msg.content)!)}
              >
                <Copy size={10} /> Use SQL
              </button>
            )}
            <div className="tp-message-content">
              {msg.content.split('```').map((part, j) => {
                if (j % 2 === 1) {
                  return (
                    <pre key={j} className="tp-code-block">
                      <code>{part.replace(/^sql?\n?/, '')}</code>
                    </pre>
                  );
                }
                return <span key={j}>{part}</span>;
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className="tp-ai-message assistant loading">
            <span className="tp-typing">Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="tp-ai-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Ask about SQL..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
