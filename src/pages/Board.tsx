import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { openExternal } from '../lib/open-url';
import {
  Plus, LayoutGrid, Clock, CheckSquare, Link as LinkIcon,
  RefreshCw, X, FileText, AlignLeft, ExternalLink, GripVertical,
  Paperclip, Upload, Trash2, Save, Send, Bot, User,
} from 'lucide-react';
import {
  getBoards,
  createCard as dbCreateCard,
  updateCard as dbUpdateCard,
  type DbBoard,
  getBoardAiMessages,
  saveBoardAiMessage,
} from '../lib/db';
import {
  getTrelloCredentials, getSyncedBoardIds, syncAllBoards,
  onSyncEvent,
} from '../lib/trello-sync';
import { chatStream } from '../lib/ai';

// ── Types ────────────────────────────────────────────

interface Attachment {
  id: string; name: string; type: string; size: number;
  dataUrl?: string; addedAt: number;
}

interface CardData {
  id: string; title: string; description: string;
  priority: string; labels: string[]; source_channel: string;
  due_date?: string | null;
  checklists?: { name: string; items: { name: string; done: boolean }[] }[];
  links?: { url: string; name: string; type: string }[];
  attachments?: Attachment[];
}

interface ColumnData { id: string; title: string; color: string; cards: CardData[]; }
interface BoardData { id: string; title: string; columns: ColumnData[]; trello_id?: string; }
type BoardAiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  actions?: BoardAiAction[];
};

type BoardAiActionType = 'move_card' | 'set_priority' | 'add_label' | 'set_due_date';
type BoardAiAction = {
  id: string;
  type: BoardAiActionType;
  label: string;
  reason?: string;
  cardId: string;
  toColumnId?: string;
  priority?: string;
  value?: string;
  dueDate?: string;
};
type SlashCommand = {
  id: string;
  label: string;
  description: string;
  prompt: string;
};

// ── Constants ────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low',
};

const LINK_META: Record<string, { icon: string; color: string; bg: string }> = {
  slack: { icon: '💬', color: '#4A154B', bg: 'rgba(74,21,75,0.1)' },
  jira: { icon: '🎫', color: '#0052CC', bg: 'rgba(0,82,204,0.1)' },
  figma: { icon: '🎨', color: '#F24E1E', bg: 'rgba(242,78,30,0.1)' },
  github: { icon: '🐙', color: '#333', bg: 'rgba(51,51,51,0.08)' },
  confluence: { icon: '📖', color: '#172B4D', bg: 'rgba(23,43,77,0.08)' },
  link: { icon: '🔗', color: '#6b7280', bg: 'rgba(107,114,128,0.08)' },
};

function normalizePriority(input?: string): string {
  const value = (input || '').toLowerCase().trim();
  if (value === 'urgent' || value === 'high' || value === 'medium' || value === 'low') return value;
  return 'medium';
}

function getColumnWorkflowSnapshot(columns: ColumnData[]) {
  return columns.map((col) => ({
    id: col.id,
    title: col.title,
    count: col.cards.length,
    cards: col.cards.slice(0, 20).map((card) => ({
      id: card.id,
      title: card.title,
      priority: card.priority,
      due_date: card.due_date || null,
      labels: card.labels,
      has_description: !!card.description,
    })),
  }));
}

function buildBoardAiPrompt(boardTitle: string, columns: ColumnData[], userRequest: string): string {
  const snapshot = {
    board_title: boardTitle,
    generated_at: new Date().toISOString(),
    workflow: getColumnWorkflowSnapshot(columns),
  };
  return [
    'You are an AI workflow analyst for a Kanban board.',
    'Focus insights by COLUMN / WORKFLOW bottlenecks, not by assignee.',
    'Return concise actionable insights in Vietnamese.',
    'Then provide apply-ready actions in a JSON code block.',
    'Rules for action JSON:',
    '- Use shape: {"actions":[{...}]}',
    '- Allowed action.type: move_card | set_priority | add_label | set_due_date',
    '- Every action MUST include: id, type, label, cardId',
    '- move_card requires toColumnId',
    '- set_priority requires priority (urgent|high|medium|low)',
    '- add_label requires value',
    '- set_due_date requires dueDate in YYYY-MM-DD',
    '- Use only existing cardId/columnId from the snapshot',
    '',
    `Board snapshot JSON:\n${JSON.stringify(snapshot, null, 2)}`,
    '',
    `User request: ${userRequest}`,
  ].join('\n');
}

function parseActionsFromAssistant(content: string): BoardAiAction[] {
  const match = content.match(/```json\s*([\s\S]*?)```/i);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as { actions?: BoardAiAction[] };
    if (!Array.isArray(parsed.actions)) return [];
    return parsed.actions
      .filter((a) => !!a && typeof a === 'object')
      .map((a, idx) => ({
        id: a.id || `ai-action-${idx + 1}`,
        type: a.type,
        label: a.label || `Action ${idx + 1}`,
        reason: a.reason,
        cardId: a.cardId,
        toColumnId: a.toColumnId,
        priority: normalizePriority(a.priority),
        value: a.value,
        dueDate: a.dueDate,
      }))
      .filter((a) =>
        (a.type === 'move_card' && !!a.toColumnId && !!a.cardId) ||
        (a.type === 'set_priority' && !!a.priority && !!a.cardId) ||
        (a.type === 'add_label' && !!a.value && !!a.cardId) ||
        (a.type === 'set_due_date' && !!a.dueDate && !!a.cardId)
      );
  } catch {
    return [];
  }
}

function toBoardData(boards: DbBoard[]): BoardData[] {
  return boards.map((board) => ({
    id: board.id,
    title: board.title,
    trello_id: typeof board.trello_id === 'string' ? board.trello_id : undefined,
    columns: board.columns.map((col) => ({
      id: col.id,
      title: col.title,
      color: col.color || '#3b82f6',
      cards: col.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description || '',
        priority: card.priority || 'medium',
        labels: card.labels || [],
        source_channel: card.source_channel || 'manual',
        due_date: card.due_date || null,
        checklists: Array.isArray(card.checklists) ? card.checklists as CardData['checklists'] : [],
        links: Array.isArray(card.links) ? card.links as CardData['links'] : [],
        attachments: Array.isArray(card.attachments) ? card.attachments as Attachment[] : [],
      })),
    })),
  }));
}

function formatAssistantDisplayText(content: string): string {
  const withoutCodeBlocks = content
    .replace(/```json[\s\S]*?```/gi, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\r\n/g, '\n');

  let listIndex = 0;
  const lines = withoutCodeBlocks.split('\n').map((line) => {
    const noHeading = line.replace(/^\s*#{1,6}\s+/, '');
    const trimmed = noHeading.trim();
    if (!trimmed) return '';

    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (bulletMatch) {
      listIndex += 1;
      return `${listIndex}. ${bulletMatch[1]}`;
    }
    if (orderedMatch) {
      listIndex += 1;
      return `${listIndex}. ${orderedMatch[1]}`;
    }
    return noHeading;
  });

  return lines
    .join('\n')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\t/g, '  ')
    .trim();
}

// ══════════════════════════════════════════════════════
//  CARD DETAIL PANEL (Right Drawer)
// ══════════════════════════════════════════════════════

function CardDetailPanel({ card, onClose, onSave }: {
  card: CardData; onClose: () => void;
  onSave: (cardId: string, updates: Partial<CardData>) => void;
}) {
  const [editing] = useState(true);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [priority, setPriority] = useState(card.priority);
  const [dueDate, setDueDate] = useState(card.due_date || '');
  const [labelsText, setLabelsText] = useState(card.labels.join(', '));
  const [attachments, setAttachments] = useState<Attachment[]>(card.attachments || []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    const updates: Partial<CardData> = {
      title: title.trim() || card.title,
      description,
      priority,
      due_date: dueDate || null,
      labels: labelsText.split(',').map(l => l.trim()).filter(Boolean),
      attachments,
    };
    onSave(card.id, updates);
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const att: Attachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: reader.result as string,
          addedAt: Date.now(),
        };
        setAttachments(prev => [...prev, att]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (attId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
  };

  const isOverdue = card.due_date ? new Date(card.due_date) < new Date() : false;
  const isImage = (type: string) => type.startsWith('image/');
  const formatSize = (bytes: number) => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';

  return (
    <>
      <div className="card-drawer-backdrop" onClick={onClose} />
      <div className="card-drawer">
        {/* Header */}
        <div className="card-drawer-header">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              {editing ? (
                <select value={priority} onChange={e => setPriority(e.target.value)}
                  className="detail-select" style={{ borderColor: PRIORITY_COLORS[priority] }}>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              ) : (
                <span style={{
                  fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                  background: PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium,
                  color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  {PRIORITY_LABELS[card.priority] || card.priority}
                </span>
              )}
              {card.source_channel === 'trello' && (
                <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#0079BF', color: '#fff' }}>TRELLO</span>
              )}
            </div>
            {editing ? (
              <input className="detail-title-input" value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Card title..." autoFocus />
            ) : (
              <h2 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.35, margin: 0 }}>{card.title}</h2>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'flex-start' }}>
            <button className="detail-action-btn save" onClick={handleSave} title="Save">
              <Save size={16} />
            </button>
            <button className="card-drawer-close" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="card-drawer-body">
          {/* Description */}
          <div className="drawer-section">
            <div className="drawer-section-title"><AlignLeft size={13} /> Description</div>
            {editing ? (
              <textarea className="detail-textarea" value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Add a description..." rows={4} />
            ) : (
              card.description ? (
                <div className="drawer-description">{card.description}</div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>No description</div>
              )
            )}
          </div>

          {/* Due Date & Labels */}
          <div className="drawer-section">
            <div className="drawer-section-title"><FileText size={13} /> Details</div>
            <div className="drawer-meta-grid">
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Due Date</span>
                {editing ? (
                  <input type="date" className="detail-date-input" value={dueDate || ''}
                    onChange={e => setDueDate(e.target.value)} />
                ) : (
                  <span className="drawer-meta-value" style={{ color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
                    {card.due_date ? new Date(card.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    {isOverdue && <span style={{ fontSize: '0.65rem', marginLeft: 4, fontWeight: 400 }}>⚠ Quá hạn</span>}
                  </span>
                )}
              </div>
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Priority</span>
                <span className="drawer-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLORS[editing ? priority : card.priority] || PRIORITY_COLORS.medium, display: 'inline-block' }} />
                  {PRIORITY_LABELS[editing ? priority : card.priority] || (editing ? priority : card.priority)}
                </span>
              </div>
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Source</span>
                <span className="drawer-meta-value" style={{ textTransform: 'capitalize' }}>{card.source_channel}</span>
              </div>
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Labels</span>
                {editing ? (
                  <input className="detail-label-input" value={labelsText}
                    onChange={e => setLabelsText(e.target.value)}
                    placeholder="bug, urgent, frontend" />
                ) : (
                  card.labels.length > 0 ? (
                    <div className="drawer-labels" style={{ marginTop: 2 }}>
                      {card.labels.map(l => <span key={l} className="label-tag" style={{ fontSize: '0.65rem' }}>{l}</span>)}
                    </div>
                  ) : <span className="drawer-meta-value">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              <Paperclip size={13} /> Attachments ({attachments.length})
              {editing && (
                <button className="detail-attach-btn" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={12} /> Add file
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
              onChange={handleFileAdd} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md" />

            {attachments.length > 0 ? (
              <div className="attachment-grid">
                {attachments.map(att => (
                  <div key={att.id} className="attachment-card">
                    {isImage(att.type) && att.dataUrl ? (
                      <div className="attachment-preview">
                        <img src={att.dataUrl} alt={att.name} />
                      </div>
                    ) : (
                      <div className="attachment-preview attachment-file">
                        <FileText size={24} />
                        <span>{att.name.split('.').pop()?.toUpperCase()}</span>
                      </div>
                    )}
                    <div className="attachment-info">
                      <span className="attachment-name" title={att.name}>{att.name}</span>
                      <span className="attachment-size">{formatSize(att.size)}</span>
                    </div>
                    {editing && (
                      <button className="attachment-remove" onClick={() => removeAttachment(att.id)} title="Remove">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !editing && <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>No attachments</div>
            )}

            {editing && (
              <div className="drop-zone" onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                <span>Click to add files or drag images, documents here</span>
              </div>
            )}
          </div>

          {/* Checklists */}
          {card.checklists && card.checklists.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title">
                <CheckSquare size={13} /> Checklists ({card.checklists.length})
              </div>
              {card.checklists.map((cl, ci) => {
                const total = cl.items.length;
                const done = cl.items.filter(i => i.done).length;
                const pct = total > 0 ? (done / total) * 100 : 0;
                return (
                  <div key={ci} className="drawer-checklist">
                    <div className="drawer-checklist-name">
                      <span>{cl.name}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: pct === 100 ? '#22c55e' : 'var(--text-muted)' }}>{done}/{total}</span>
                    </div>
                    <div className="drawer-checklist-progress">
                      <div className="drawer-checklist-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : 'var(--accent)' }} />
                    </div>
                    {cl.items.map((item, ii) => (
                      <div key={ii} className={`drawer-check-item ${item.done ? 'done' : ''}`}>
                        <input type="checkbox" checked={item.done} readOnly />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Links */}
          {card.links && card.links.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title"><LinkIcon size={13} /> Links ({card.links.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {card.links.map((link, i) => {
                  const meta = LINK_META[link.type] || LINK_META.link;
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="drawer-link-item"
                      onClick={e => { e.preventDefault(); openExternal(link.url); }}>
                      <div className="drawer-link-icon" style={{ background: meta.bg }}>{meta.icon}</div>
                      <div className="drawer-link-text" title={link.name}>{link.name || link.url}</div>
                      <ExternalLink size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
//  CARD (with mouse-based drag via grip handle)
// ══════════════════════════════════════════════════════

function KanbanCard({ card, columnId, onSelect, onGripMouseDown }: {
  card: CardData;
  columnId: string;
  onSelect: (card: CardData) => void;
  onGripMouseDown: (e: React.MouseEvent, cardId: string, columnId: string) => void;
}) {
  const totalItems = card.checklists?.reduce((s, cl) => s + cl.items.length, 0) || 0;
  const doneItems = card.checklists?.reduce((s, cl) => s + cl.items.filter(i => i.done).length, 0) || 0;
  const isOverdue = card.due_date ? new Date(card.due_date) < new Date() : false;
  const handleCardMouseDown = (e: React.MouseEvent) => {
    // Keep native behavior for interactive controls inside the card
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="button"]')) return;
    if (e.button !== 0) return;
    onGripMouseDown(e, card.id, columnId);
  };

  return (
    <div
      className="kanban-card"
      data-card-id={card.id}
      data-column-id={columnId}
      onMouseDown={handleCardMouseDown}
    >
      {/* Card layout: drag handle + clickable body */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {/* Drag handle — mousedown triggers Board-level drag */}
        <div
          onMouseDown={(e) => onGripMouseDown(e, card.id, columnId)}
          style={{
            cursor: 'grab', padding: '2px 0', color: 'var(--text-muted)',
            opacity: 0.35, flexShrink: 0, display: 'flex', alignItems: 'flex-start',
            marginTop: '1px', userSelect: 'none',
          }}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>

        {/* Clickable card body */}
        <div style={{ flex: 1, cursor: 'pointer', minWidth: 0 }} onClick={() => onSelect(card)}>
          <div className="kanban-card-title">{card.title}</div>

          {card.description && (
            <div className="kanban-card-desc">
              {card.description.slice(0, 100)}{card.description.length > 100 ? '…' : ''}
            </div>
          )}

          {/* Meta row */}
          {(card.due_date || totalItems > 0) && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              {card.due_date && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: '0.65rem', fontWeight: 600,
                  background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.1)',
                  color: isOverdue ? '#dc2626' : '#3b82f6',
                  padding: '2px 6px', borderRadius: 4,
                }}>
                  <Clock size={10} />
                  {new Date(card.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
              {totalItems > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: '0.65rem', fontWeight: 600,
                  color: doneItems === totalItems ? '#22c55e' : 'var(--text-muted)',
                  background: doneItems === totalItems ? 'rgba(34,197,94,0.1)' : 'var(--bg-card)',
                  padding: '2px 6px', borderRadius: 4,
                }}>
                  <CheckSquare size={10} />
                  {doneItems}/{totalItems}
                </span>
              )}
            </div>
          )}

          {/* Links */}
          {card.links && card.links.length > 0 && (
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
              {card.links.slice(0, 3).map((link, i) => {
                const meta = LINK_META[link.type] || LINK_META.link;
                return (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); openExternal(link.url); }}
                    title={link.name}
                    style={{
                      fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3,
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      color: 'var(--text-muted)', textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                    }}>
                    {meta.icon} {link.type}
                  </a>
                );
              })}
              {card.links.length > 3 && (
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{card.links.length - 3}</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="kanban-card-footer">
            <div className="kanban-card-labels">
              {card.labels.slice(0, 3).map((l) => (
                <span key={l} className="label-tag">{l}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {card.source_channel === 'trello' && (
                <span style={{ fontSize: '0.55rem', background: '#0079BF', color: 'white', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                  TRELLO
                </span>
              )}
              {card.source_channel !== 'manual' && card.source_channel !== 'trello' && (
                <span className={`channel-badge ${card.source_channel}`}>{card.source_channel}</span>
              )}
              <span className={`priority-dot priority-${card.priority}`} title={card.priority} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  INLINE ADD CARD
// ══════════════════════════════════════════════════════

function InlineAddCard({ columnId, onSubmit, onCancel }: {
  columnId: string;
  onSubmit: (columnId: string, title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit(columnId, title.trim());
    setTitle('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="inline-add-card">
      <textarea
        ref={textareaRef}
        className="inline-add-textarea"
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a title for this card..."
        rows={2}
      />
      <div className="inline-add-actions">
        <button className="inline-add-submit" onClick={handleSubmit} disabled={!title.trim()}>
          Add Card
        </button>
        <button className="inline-add-cancel" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  COLUMN
// ══════════════════════════════════════════════════════

function KanbanColumn({ column, onAddCard, onSelectCard, onGripMouseDown, isDragOver }: {
  column: ColumnData;
  onAddCard: (colId: string, title: string) => void;
  onSelectCard: (card: CardData) => void;
  onGripMouseDown: (e: React.MouseEvent, cardId: string, columnId: string) => void;
  isDragOver: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div
      className={`kanban-column ${isDragOver ? 'column-drag-over' : ''}`}
      style={{ '--col-color': column.color } as React.CSSProperties}
      data-column-id={column.id}
    >
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span className="dot" style={{ background: column.color }} />
          {column.title}
        </div>
        <span className="kanban-column-count">{column.cards.length}</span>
      </div>
      <div className="kanban-cards" style={{ minHeight: 60 }}>
        {column.cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            columnId={column.id}
            onSelect={onSelectCard}
            onGripMouseDown={onGripMouseDown}
          />
        ))}

        {showAddForm ? (
          <InlineAddCard
            columnId={column.id}
            onSubmit={(colId, title) => {
              onAddCard(colId, title);
              // Keep form open for adding more cards
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button className="add-card-btn" onClick={() => setShowAddForm(true)}>
            <Plus size={13} /> Add card
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  BOARD PAGE
// ══════════════════════════════════════════════════════

export function Board() {
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [hasTrello, setHasTrello] = useState(false);

  // Mouse-based DnD state
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [chatMinimized, setChatMinimized] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<BoardAiChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [quickPromptsHidden, setQuickPromptsHidden] = useState(false);
  const [activeSlashIndex, setActiveSlashIndex] = useState(0);
  const quickPrompts = useMemo(() => ([
    'Phân tích bottleneck theo workflow hiện tại và nêu 3 insight quan trọng nhất.',
    'Đề xuất các action có thể apply ngay để đẩy card đang kẹt sang cột tiếp theo.',
  ]), []);
  const slashCommands = useMemo<SlashCommand[]>(() => ([
    {
      id: 'workflow-bottleneck',
      label: 'Workflow bottleneck',
      description: 'Phân tích điểm nghẽn theo từng cột',
      prompt: 'Phân tích bottleneck theo workflow hiện tại và nêu 3 insight quan trọng nhất.',
    },
    {
      id: 'apply-actions',
      label: 'Apply-ready actions',
      description: 'Đề xuất các action có thể apply ngay',
      prompt: 'Đề xuất các action có thể apply ngay để đẩy card đang kẹt sang cột tiếp theo.',
    },
    {
      id: 'sla-risk',
      label: 'SLA risk check',
      description: 'Rà soát nguy cơ trễ hạn trong workflow',
      prompt: 'Kiểm tra rủi ro trễ hạn theo từng cột workflow và đề xuất xử lý ưu tiên.',
    },
  ]), []);
  const dragRef = useRef<{
    cardId: string;
    fromColumnId: string;
    ghost: HTMLDivElement | null;
    started: boolean;
    startX: number;
    startY: number;
  } | null>(null);

  const columns = useMemo(() => boards[activeBoardIndex]?.columns ?? [], [boards, activeBoardIndex]);
  const activeBoard = boards[activeBoardIndex];
  const showSlashCommands = chatInput.startsWith('/');
  const slashQuery = showSlashCommands ? chatInput.slice(1).trim().toLowerCase() : '';
  const filteredSlashCommands = useMemo(() => {
    if (!showSlashCommands) return [];
    if (!slashQuery) return slashCommands;
    return slashCommands.filter((cmd) =>
      cmd.label.toLowerCase().includes(slashQuery) ||
      cmd.description.toLowerCase().includes(slashQuery)
    );
  }, [showSlashCommands, slashQuery, slashCommands]);

  useEffect(() => {
    loadBoards();
    (async () => {
      const creds = await getTrelloCredentials();
      const boardIds = await getSyncedBoardIds();
      setHasTrello(!!creds && boardIds.length > 0);
    })();
  }, []);

  useEffect(() => {
    return onSyncEvent((ev) => {
      if (ev.status === 'success') loadBoards();
      setSyncingNow(ev.status === 'syncing');
    });
  }, []);

  useEffect(() => {
    const boardId = activeBoard?.id;
    if (!boardId) {
      setChatMessages([]);
      setQuickPromptsHidden(false);
      return;
    }
    (async () => {
      try {
        const rows = await getBoardAiMessages(boardId, 100);
        setQuickPromptsHidden(rows.length > 0);
        setChatMessages(rows
          .filter((r): r is typeof r & { role: 'user' | 'assistant' } => r.role === 'user' || r.role === 'assistant')
          .map((r) => {
            let actions: BoardAiAction[] | undefined;
            try {
              const meta = JSON.parse(r.metadata || '{}') as { actions?: BoardAiAction[] };
              actions = meta.actions;
            } catch {
              actions = undefined;
            }
            return {
              id: r.id,
              role: r.role,
              content: r.content,
              createdAt: r.created_at,
              actions,
            };
          }));
      } catch (e) {
        console.error('AI chat history load error:', e);
      }
    })();
  }, [activeBoard?.id]);

  useEffect(() => {
    if (!showSlashCommands) {
      setActiveSlashIndex(0);
      return;
    }
    if (activeSlashIndex >= filteredSlashCommands.length) {
      setActiveSlashIndex(0);
    }
  }, [showSlashCommands, activeSlashIndex, filteredSlashCommands.length]);

  async function loadBoards() {
    try {
      const all = await getBoards();
      setBoards(toBoardData(all));
    } catch (e) { console.error('Board load error:', e); }
    setLoading(false);
  }

  const applySlashCommand = useCallback((command: SlashCommand) => {
    setChatInput(command.prompt);
    setQuickPromptsHidden(true);
    setActiveSlashIndex(0);
  }, []);

  const handleSendAiPrompt = useCallback(async () => {
    const board = boards[activeBoardIndex];
    const text = chatInput.trim();
    if (!board || !text || chatLoading) return;

    const userMsg: BoardAiChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    setChatInput('');
    setChatLoading(true);
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      await saveBoardAiMessage({
        board_id: board.id,
        role: 'user',
        content: text,
      });

      let assistantText = '';
      await chatStream(
        [
          ...chatMessages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: buildBoardAiPrompt(board.title, board.columns, text) },
        ],
        (chunk) => {
          assistantText += chunk;
          setChatMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last?.role === 'assistant' && last.id === 'streaming-assistant') {
              copy[copy.length - 1] = {
                ...last,
                content: assistantText,
                actions: parseActionsFromAssistant(assistantText),
              };
              return copy;
            }
            return [...copy, {
              id: 'streaming-assistant',
              role: 'assistant',
              content: assistantText,
              createdAt: Date.now(),
              actions: parseActionsFromAssistant(assistantText),
            }];
          });
        },
        () => undefined
      );

      const actions = parseActionsFromAssistant(assistantText);
      const finalAssistantMsg: BoardAiChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText,
        createdAt: Date.now(),
        actions,
      };
      setChatMessages((prev) => [
        ...prev.filter((m) => m.id !== 'streaming-assistant'),
        finalAssistantMsg,
      ]);

      await saveBoardAiMessage({
        board_id: board.id,
        role: 'assistant',
        content: assistantText,
        metadata: JSON.stringify({ actions }),
      });
    } catch (e) {
      const errText = e instanceof Error ? e.message : 'Unknown error';
      setChatMessages((prev) => [
        ...prev.filter((m) => m.id !== 'streaming-assistant'),
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ AI error: ${errText}`,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [activeBoardIndex, boards, chatInput, chatLoading, chatMessages]);

  const stats = useMemo(() => {
    const totalCards = columns.reduce((s, c) => s + c.cards.length, 0);
    const totalChecklists = columns.reduce((s, c) =>
      s + c.cards.reduce((cs, card) => cs + (card.checklists?.length || 0), 0), 0);
    const totalLinks = columns.reduce((s, c) =>
      s + c.cards.reduce((ls, card) => ls + (card.links?.length || 0), 0), 0);
    const overdue = columns.reduce((s, c) =>
      s + c.cards.filter(card => card.due_date && new Date(card.due_date) < new Date()).length, 0);
    return { totalCards, totalChecklists, totalLinks, overdue, columns: columns.length };
  }, [columns]);

  // ── Mouse-based drag-and-drop ──────────────────────
  const handleGripMouseDown = useCallback((e: React.MouseEvent, cardId: string, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      cardId,
      fromColumnId: columnId,
      ghost: null,
      started: false,
      startX: e.clientX,
      startY: e.clientY,
    };

    const onMouseMove = (ev: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      // Start dragging after 5px threshold
      if (!drag.started) {
        const dx = ev.clientX - drag.startX;
        const dy = ev.clientY - drag.startY;
        if (Math.sqrt(dx * dx + dy * dy) < 5) return;
        drag.started = true;

        // Create ghost element
        const cardEl = document.querySelector(`[data-card-id="${drag.cardId}"]`) as HTMLElement;
        if (cardEl) {
          cardEl.classList.add('dragging');
          const ghost = document.createElement('div');
          ghost.className = 'kanban-card-ghost';
          ghost.style.width = cardEl.offsetWidth + 'px';
          ghost.textContent = cardEl.querySelector('.kanban-card-title')?.textContent || '';
          document.body.appendChild(ghost);
          drag.ghost = ghost;
        }
      }

      // Move ghost
      if (drag.ghost) {
        drag.ghost.style.left = ev.clientX + 12 + 'px';
        drag.ghost.style.top = ev.clientY - 10 + 'px';
      }

      // Find which column the cursor is over
      const elements = document.elementsFromPoint(ev.clientX, ev.clientY);
      const colEl = elements.find(el => el.hasAttribute('data-column-id'));
      const hoveredColId = colEl?.getAttribute('data-column-id') || null;
      setDragOverColId(hoveredColId);
    };

    const onMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      const drag = dragRef.current;
      if (!drag) return;

      // Remove ghost
      if (drag.ghost) {
        drag.ghost.remove();
      }

      // Remove dragging class
      const cardEl = document.querySelector(`[data-card-id="${drag.cardId}"]`) as HTMLElement;
      if (cardEl) cardEl.classList.remove('dragging');

      // Find target column
      if (drag.started) {
        const elements = document.elementsFromPoint(ev.clientX, ev.clientY);
        const colEl = elements.find(el => el.hasAttribute('data-column-id'));
        const toColumnId = colEl?.getAttribute('data-column-id');

        if (toColumnId && toColumnId !== drag.fromColumnId) {
          // Move card!
          setBoards((prevBoards) => {
            const newBoards = [...prevBoards];
            const board = { ...newBoards[activeBoardIndex] };
            const fromCol = board.columns.find(c => c.id === drag.fromColumnId);
            const movedCard = fromCol?.cards.find(c => c.id === drag.cardId);
            if (!movedCard) return prevBoards;

            board.columns = board.columns.map((col) => {
              if (col.id === drag.fromColumnId) {
                return { ...col, cards: col.cards.filter(c => c.id !== drag.cardId) };
              }
              if (col.id === toColumnId) {
                return { ...col, cards: [...col.cards, movedCard] };
              }
              return col;
            });
            newBoards[activeBoardIndex] = board;
            return newBoards;
          });
        }
      }

      setDragOverColId(null);
      dragRef.current = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [activeBoardIndex]);

  const handleAddCard = async (columnId: string, title: string) => {
    try {
      await dbCreateCard(columnId, title);
      loadBoards();
    } catch {
      const newCard: CardData = { id: `c-${Date.now()}`, title, description: '', priority: 'medium', labels: [], source_channel: 'manual' };
      setBoards((prev) => {
        const newBoards = [...prev];
        const board = { ...newBoards[activeBoardIndex] };
        board.columns = board.columns.map((col) =>
          col.id === columnId ? { ...col, cards: [...col.cards, newCard] } : col
        );
        newBoards[activeBoardIndex] = board;
        return newBoards;
      });
    }
  };

  const handleSaveCard = async (cardId: string, updates: Partial<CardData>) => {
    try {
      await dbUpdateCard(cardId, {
        title: updates.title,
        description: updates.description,
        priority: updates.priority,
        labels: updates.labels,
        due_date: updates.due_date,
        checklists: updates.checklists,
        links: updates.links,
        attachments: updates.attachments,
      });
      await loadBoards();
    } catch (e) {
      console.error('Save error:', e);
    }
    // Refresh selected card
    setSelectedCard((prev) => prev ? { ...prev, ...updates } : null);
  };

  const handleSyncNow = async () => {
    setSyncingNow(true);
    try {
      await syncAllBoards();
      await loadBoards();
    } catch (e) { console.error('Sync error:', e); }
    setSyncingNow(false);
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <h3 style={{ marginTop: 12 }}>Loading boards...</h3>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title={boards[activeBoardIndex]?.title || 'Kanban Board'}
        subtitle={`${stats.totalCards} cards across ${stats.columns} columns`}
        addLabel="New Card"
        onAdd={() => columns[0] && handleAddCard(columns[0].id, 'New Card')}
      />
      <div className="page-content">
        <div className="kanban-board-wrapper">

          {/* Stats Bar */}
          <div className="board-stats-bar">
            <div className="stat-item">
              <LayoutGrid size={13} />
              <span className="stat-value">{stats.totalCards}</span> cards
            </div>
            <div className="stat-divider" />
            {stats.overdue > 0 && (
              <>
                <div className="stat-item" style={{ color: '#ef4444' }}>
                  <Clock size={13} />
                  <span className="stat-value" style={{ color: '#ef4444' }}>{stats.overdue}</span> overdue
                </div>
                <div className="stat-divider" />
              </>
            )}
            {stats.totalChecklists > 0 && (
              <>
                <div className="stat-item">
                  <CheckSquare size={13} />
                  <span className="stat-value">{stats.totalChecklists}</span> checklists
                </div>
                <div className="stat-divider" />
              </>
            )}
            {stats.totalLinks > 0 && (
              <div className="stat-item">
                <LinkIcon size={13} />
                <span className="stat-value">{stats.totalLinks}</span> links
              </div>
            )}

            <div className="board-selector">
              {hasTrello && (
                <button onClick={handleSyncNow} disabled={syncingNow}
                  style={{
                    background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    padding: '0.25rem 0.5rem', cursor: syncingNow ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'inherit',
                  }}>
                  <RefreshCw size={12} className={syncingNow ? 'spinning' : ''} />
                  {syncingNow ? 'Syncing...' : 'Sync'}
                </button>
              )}
              {boards.length > 1 && (
                <select value={activeBoardIndex}
                  onChange={e => setActiveBoardIndex(Number(e.target.value))}>
                  {boards.map((b, i) => (
                    <option key={b.id} value={i}>{b.title}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Board */}
          <div className="kanban-board">
            {columns.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                onAddCard={handleAddCard}
                onSelectCard={setSelectedCard}
                onGripMouseDown={handleGripMouseDown}
                isDragOver={dragOverColId === col.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Card Detail Panel */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onSave={handleSaveCard}
        />
      )}

      {/* Kanban AI Chatbox */}
      <div className="kanban-ai-chat">
        {chatMinimized ? (
          <button
            className="kanban-ai-fab"
            onClick={() => setChatMinimized(false)}
            aria-label="Open AI chat"
            title="Open AI chat"
          >
            <Bot size={18} />
          </button>
        ) : (
          <div className="kanban-ai-panel">
            <div
              className="kanban-ai-header"
              onClick={() => setChatMinimized(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setChatMinimized(true);
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Bot size={14} />
                <strong>Workflow Insight</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>{activeBoard?.title || 'Board'}</span>
                <button
                  className="kanban-ai-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChatMinimized(true);
                  }}
                  aria-label="Minimize chat"
                  title="Minimize chat"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <>
              <div className="kanban-ai-messages">
                {chatMessages.length === 0 && (
                  <div className="kanban-ai-empty">
                    Hỏi AI để phân tích bottleneck theo cột/workflow và nhận gợi ý có thể apply ngay.
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`kanban-ai-message ${msg.role}`}>
                    <div className={`kanban-ai-avatar ${msg.role}`}>
                      {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className="kanban-ai-bubble-wrap">
                      <span className="kanban-ai-bubble-label">
                        {msg.role === 'assistant' ? 'AI Assistant' : 'You'}
                      </span>
                      <div className={`kanban-ai-message-body ${msg.role}`}>
                        {msg.role === 'assistant' ? formatAssistantDisplayText(msg.content) : msg.content}
                      </div>
                      {msg.role === 'assistant' && msg.actions && msg.actions.length > 0 && (
                        <div className="kanban-ai-actions-suggested">
                          <div className="kanban-ai-actions-title">Suggested next actions</div>
                          <div className="kanban-ai-actions-list">
                            {msg.actions.map((action, idx) => (
                              <div key={action.id} className="kanban-ai-actions-item">
                                {idx + 1}. {action.label}{action.reason ? ` - ${action.reason}` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="kanban-ai-input-wrap">
                {!quickPromptsHidden && (
                  <div className="kanban-ai-quick-actions">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="kanban-ai-quick-btn"
                        onClick={() => {
                          setChatInput(prompt);
                          setQuickPromptsHidden(true);
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
                <div className="kanban-ai-input-shell">
                  <textarea
                    className="kanban-ai-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    rows={2}
                    placeholder="Ví dụ: phân tích bottleneck theo workflow tuần này và đề xuất action"
                    onKeyDown={(e) => {
                      if (showSlashCommands && filteredSlashCommands.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setActiveSlashIndex((prev) => (prev + 1) % filteredSlashCommands.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setActiveSlashIndex((prev) => (prev - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
                          return;
                        }
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          const selected = filteredSlashCommands[activeSlashIndex];
                          if (selected) applySlashCommand(selected);
                          return;
                        }
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSendAiPrompt();
                      }
                    }}
                  />
                  {showSlashCommands && (
                    <div className="kanban-ai-slash-menu">
                      {filteredSlashCommands.length === 0 ? (
                        <div className="kanban-ai-slash-empty">Không có quick suggestion phù hợp</div>
                      ) : (
                        filteredSlashCommands.map((command, index) => (
                          <button
                            key={command.id}
                            type="button"
                            className={`kanban-ai-slash-item ${index === activeSlashIndex ? 'active' : ''}`}
                            onClick={() => applySlashCommand(command)}
                          >
                            <div className="kanban-ai-slash-label">/{command.label}</div>
                            <div className="kanban-ai-slash-desc">{command.description}</div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    className="kanban-ai-slash-tip-btn"
                    onClick={() => setChatInput('/')}
                    title="Quick suggestions"
                  >
                    /
                  </button>
                  <button
                    className="kanban-ai-send-btn"
                    onClick={() => void handleSendAiPrompt()}
                    disabled={chatLoading || !chatInput.trim() || chatInput.trim().startsWith('/')}
                    title="Send"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <div className="kanban-ai-input-footer">
                  <span className="kanban-ai-input-hint">Gõ "/" để mở quick suggestion. AI can make mistakes.</span>
                </div>
              </div>
            </>
          </div>
        )}
      </div>
    </>
  );
}
