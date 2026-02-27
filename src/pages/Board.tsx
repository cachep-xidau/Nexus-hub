import { useState, useCallback, useEffect, useMemo } from 'react';
import { Header } from '../components/layout/Header';
import {
  DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
  type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, LayoutGrid, Clock, CheckSquare, Link as LinkIcon,
  RefreshCw, X, FileText, Tag, AlignLeft, ExternalLink, GripVertical,
} from 'lucide-react';
import { getBoards, createCard as dbCreateCard } from '../lib/db';
import {
  getTrelloCredentials, getSyncedBoardIds, syncAllBoards,
  onSyncEvent,
} from '../lib/trello-sync';

// ── Types ────────────────────────────────────────────

interface CardData {
  id: string; title: string; description: string;
  priority: string; labels: string[]; source_channel: string;
  due_date?: string | null;
  checklists?: { name: string; items: { name: string; done: boolean }[] }[];
  links?: { url: string; name: string; type: string }[];
}

interface ColumnData { id: string; title: string; color: string; cards: CardData[]; }
interface BoardData { id: string; title: string; columns: ColumnData[]; trello_id?: string; }

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

// ══════════════════════════════════════════════════════
//  CARD DETAIL PANEL (Right Drawer)
// ══════════════════════════════════════════════════════

function CardDetailPanel({ card, onClose }: { card: CardData; onClose: () => void }) {
  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isOverdue = card.due_date ? new Date(card.due_date) < new Date() : false;

  return (
    <>
      {/* Backdrop */}
      <div className="card-drawer-backdrop" onClick={onClose} />

      {/* Drawer */}
      <div className="card-drawer">
        {/* Header */}
        <div className="card-drawer-header">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
              {/* Priority badge */}
              <span style={{
                fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                background: PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium,
                color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {PRIORITY_LABELS[card.priority] || card.priority}
              </span>
              {/* Source badge */}
              {card.source_channel === 'trello' && (
                <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#0079BF', color: '#fff' }}>
                  TRELLO
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.35, margin: 0 }}>
              {card.title}
            </h2>
          </div>
          <button className="card-drawer-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="card-drawer-body">

          {/* Description */}
          {card.description && (
            <div className="drawer-section">
              <div className="drawer-section-title">
                <AlignLeft size={13} /> Description
              </div>
              <div className="drawer-description">{card.description}</div>
            </div>
          )}

          {/* Meta Grid */}
          <div className="drawer-section">
            <div className="drawer-section-title">
              <FileText size={13} /> Details
            </div>
            <div className="drawer-meta-grid">
              {card.due_date && (
                <div className="drawer-meta-item" style={{
                  borderLeft: `3px solid ${isOverdue ? '#ef4444' : '#3b82f6'}`,
                }}>
                  <span className="drawer-meta-label">Due Date</span>
                  <span className="drawer-meta-value" style={{ color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
                    {new Date(card.due_date).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                    })}
                    {isOverdue && <span style={{ fontSize: '0.65rem', marginLeft: 4, fontWeight: 400 }}>⚠ Quá hạn</span>}
                  </span>
                </div>
              )}
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Priority</span>
                <span className="drawer-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium,
                    display: 'inline-block',
                  }} />
                  {PRIORITY_LABELS[card.priority] || card.priority}
                </span>
              </div>
              <div className="drawer-meta-item">
                <span className="drawer-meta-label">Source</span>
                <span className="drawer-meta-value" style={{ textTransform: 'capitalize' }}>
                  {card.source_channel}
                </span>
              </div>
              {card.labels.length > 0 && (
                <div className="drawer-meta-item" style={{ gridColumn: card.due_date ? 'span 1' : 'span 2' }}>
                  <span className="drawer-meta-label">Labels</span>
                  <div className="drawer-labels" style={{ marginTop: 2 }}>
                    {card.labels.map((l) => (
                      <span key={l} className="label-tag" style={{ fontSize: '0.65rem' }}>{l}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: pct === 100 ? '#22c55e' : 'var(--text-muted)' }}>
                        {done}/{total}
                      </span>
                    </div>
                    <div className="drawer-checklist-progress">
                      <div className="drawer-checklist-progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100 ? '#22c55e' : 'var(--accent)',
                        }}
                      />
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
              <div className="drawer-section-title">
                <LinkIcon size={13} /> Links ({card.links.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {card.links.map((link, i) => {
                  const meta = LINK_META[link.type] || LINK_META.link;
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="drawer-link-item">
                      <div className="drawer-link-icon" style={{ background: meta.bg }}>
                        {meta.icon}
                      </div>
                      <div className="drawer-link-text" title={link.name}>
                        {link.name || link.url}
                      </div>
                      <ExternalLink size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!card.description && (!card.checklists || card.checklists.length === 0) && (!card.links || card.links.length === 0) && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              <FileText size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontSize: 'var(--text-sm)' }}>No details available</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
//  SORTABLE CARD
// ══════════════════════════════════════════════════════

function SortableCard({ card, onSelect }: { card: CardData; onSelect: (card: CardData) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform), transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const totalItems = card.checklists?.reduce((s, cl) => s + cl.items.length, 0) || 0;
  const doneItems = card.checklists?.reduce((s, cl) => s + cl.items.filter(i => i.done).length, 0) || 0;
  const isOverdue = card.due_date ? new Date(card.due_date) < new Date() : false;

  return (
    <div ref={setNodeRef} style={style} className={`kanban-card ${isDragging ? 'dragging' : ''}`}>
      {/* Priority strip */}
      <div className="kanban-card-priority-strip"
        style={{ background: PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium }} />

      {/* Card layout: drag handle + clickable body */}
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {/* Drag handle — ONLY this element has dnd-kit listeners */}
        <div
          {...attributes} {...listeners}
          style={{
            cursor: 'grab', padding: '2px 0', color: 'var(--text-muted)',
            opacity: 0.35, flexShrink: 0, display: 'flex', alignItems: 'flex-start',
            marginTop: '1px',
          }}
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>

        {/* Clickable card body — normal onClick, no dnd-kit interference */}
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
                    onClick={e => e.stopPropagation()}
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
//  COLUMN
// ══════════════════════════════════════════════════════

function KanbanColumn({ column, onAddCard, onSelectCard }: {
  column: ColumnData;
  onAddCard: (colId: string) => void;
  onSelectCard: (card: CardData) => void;
}) {
  return (
    <div className="kanban-column" style={{ '--col-color': column.color } as React.CSSProperties}>
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span className="dot" style={{ background: column.color }} />
          {column.title}
        </div>
        <span className="kanban-column-count">{column.cards.length}</span>
      </div>
      <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="kanban-cards">
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} onSelect={onSelectCard} />
          ))}
          <button className="add-card-btn" onClick={() => onAddCard(column.id)}>
            <Plus size={13} /> Add card
          </button>
        </div>
      </SortableContext>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  BOARD PAGE
// ══════════════════════════════════════════════════════

export function Board() {
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);
  const [activeCard, setActiveCard] = useState<CardData | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingNow, setSyncingNow] = useState(false);
  const [hasTrello, setHasTrello] = useState(false);

  const columns = boards[activeBoardIndex]?.columns || [];

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

  async function loadBoards() {
    try {
      const all = await getBoards();
      setBoards(all);
    } catch (e) { console.error('Board load error:', e); }
    setLoading(false);
  }

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findColumn = useCallback(
    (cardId: string) => columns.find((col) => col.cards.some((c) => c.id === cardId)),
    [columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const col = findColumn(String(event.active.id));
    const card = col?.cards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;
    const activeCol = findColumn(activeId);
    const overCol = findColumn(overId) || columns.find((c) => c.id === overId);
    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setBoards((prevBoards) => {
      const newBoards = [...prevBoards];
      const board = { ...newBoards[activeBoardIndex] };
      const movedCard = activeCol.cards.find((c) => c.id === activeId);
      if (!movedCard) return prevBoards;
      board.columns = board.columns.map((col) => {
        if (col.id === activeCol.id) return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
        if (col.id === overCol.id) {
          const overIndex = col.cards.findIndex((c) => c.id === overId);
          const newCards = [...col.cards];
          overIndex >= 0 ? newCards.splice(overIndex, 0, movedCard) : newCards.push(movedCard);
          return { ...col, cards: newCards };
        }
        return col;
      });
      newBoards[activeBoardIndex] = board;
      return newBoards;
    });
  };

  const handleDragEnd = () => setActiveCard(null);

  const handleAddCard = async (columnId: string) => {
    const title = prompt('Card title:');
    if (!title) return;
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
        onAdd={() => columns[0] && handleAddCard(columns[0].id)}
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
          <DndContext sensors={sensors} collisionDetection={closestCorners}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="kanban-board">
              {columns.map((col) => (
                <KanbanColumn key={col.id} column={col} onAddCard={handleAddCard} onSelectCard={setSelectedCard} />
              ))}
            </div>
            <DragOverlay>
              {activeCard ? (
                <div className="kanban-card" style={{
                  boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
                  transform: 'rotate(2deg) scale(1.02)',
                  borderColor: 'var(--accent)',
                }}>
                  <div className="kanban-card-priority-strip"
                    style={{ background: PRIORITY_COLORS[activeCard.priority] || PRIORITY_COLORS.medium }} />
                  <div className="kanban-card-title">{activeCard.title}</div>
                  {activeCard.description && (
                    <div className="kanban-card-desc">{activeCard.description.slice(0, 60)}…</div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Card Detail Panel */}
      {selectedCard && (
        <CardDetailPanel card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </>
  );
}
