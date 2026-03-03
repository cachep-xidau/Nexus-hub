/**
 * Trello Sync Engine for Nexus Hub
 * Pull: Trello -> local SQLite
 * Push: local outbox queue -> Trello
 */

import {
  getBoardFull,
  getBoards as getTrelloBoards,
  getMemberCards,
  mapBoard,
  mapCard,
  mapList,
  createTrelloCard,
  updateTrelloCard,
  moveTrelloCard,
  deleteTrelloCard,
  type TrelloBoardFull,
} from './trello-api';
import { getDb, getSetting, saveSetting } from './db';

// ── Sync State ────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null;
let syncing = false;
const listeners: Set<(event: SyncEvent) => void> = new Set();
type SqlRow = Record<string, string | number | null>;
export const DEFAULT_SYNC_INTERVAL_MS = 120_000;

function parseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncEvent {
  status: SyncStatus;
  message: string;
  boardCount?: number;
  cardCount?: number;
  lastSync?: string;
}

function emit(event: SyncEvent) {
  listeners.forEach((fn) => fn(event));
}

export function onSyncEvent(fn: (event: SyncEvent) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// ── Credentials ───────────────────────────────────

export async function getTrelloCredentials(): Promise<{ key: string; token: string } | null> {
  const key = await getSetting('trello_api_key');
  const token = await getSetting('trello_token');
  if (!key || !token) return null;
  return { key, token };
}

export async function saveTrelloCredentials(key: string, token: string) {
  await saveSetting('trello_api_key', key);
  await saveSetting('trello_token', token);
}

export async function getSyncedBoardIds(): Promise<string[]> {
  const raw = await getSetting('trello_board_ids');
  if (!raw) return [];
  return parseStringArray(raw);
}

export async function saveSyncedBoardIds(ids: string[]) {
  await saveSetting('trello_board_ids', JSON.stringify(ids));
}

export async function getWorkspaceInboxBridgeConfig(): Promise<{ boardId: string | null; listId: string | null }> {
  const boardId = await getSetting('trello_workspace_inbox_board_id');
  const listId = await getSetting('trello_workspace_inbox_list_id');
  return { boardId: boardId || null, listId: listId || null };
}

async function importWorkspaceInboxToBridgeList(
  key: string,
  token: string,
  bridge: { boardId: string | null; listId: string | null }
): Promise<number> {
  if (!bridge.boardId || !bridge.listId) return 0;

  const [openBoards, memberCards] = await Promise.all([
    getTrelloBoards(key, token),
    getMemberCards(key, token),
  ]);

  const openBoardIds = new Set(openBoards.map((b) => b.id));
  const candidates = memberCards.filter((card) => {
    if (card.closed) return false;
    if (card.idList === bridge.listId) return false;
    const boardId = typeof card.idBoard === 'string' ? card.idBoard : '';
    // Best-effort heuristic: cards not attached to visible open boards are likely inbox-like items.
    return !boardId || !openBoardIds.has(boardId);
  });

  let moved = 0;
  for (const card of candidates) {
    try {
      await moveTrelloCard(card.id, { idList: bridge.listId, pos: 'top' }, key, token);
      moved += 1;
    } catch {
      // keep best-effort behavior; ignore individual move errors
    }
  }

  return moved;
}

// ── DB Upsert Functions (pull) ────────────────────

async function upsertBoard(trelloId: string, title: string, description: string): Promise<string> {
  const d = await getDb();
  const existing = await d.select<SqlRow[]>('SELECT id FROM boards WHERE trello_id = ?', [trelloId]);
  if (existing.length > 0) {
    await d.execute('UPDATE boards SET title = ?, description = ?, updated_at = ? WHERE trello_id = ?', [
      title,
      description,
      Date.now(),
      trelloId,
    ]);
    return String(existing[0].id);
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  await d.execute('INSERT INTO boards (id, title, description, trello_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    title,
    description,
    trelloId,
    now,
    now,
  ]);
  return id;
}

async function upsertColumn(trelloId: string, boardId: string, title: string, position: number, color: string): Promise<string> {
  const d = await getDb();
  const existing = await d.select<SqlRow[]>('SELECT id FROM columns WHERE trello_id = ?', [trelloId]);
  if (existing.length > 0) {
    await d.execute('UPDATE columns SET title = ?, position = ?, color = ?, board_id = ? WHERE trello_id = ?', [
      title,
      position,
      color,
      boardId,
      trelloId,
    ]);
    return String(existing[0].id);
  }
  const id = crypto.randomUUID();
  await d.execute('INSERT INTO columns (id, board_id, title, position, color, trello_id) VALUES (?, ?, ?, ?, ?, ?)', [
    id,
    boardId,
    title,
    position,
    color,
    trelloId,
  ]);
  return id;
}

async function upsertCard(
  trelloId: string,
  columnId: string,
  title: string,
  description: string,
  priority: string,
  labels: string[],
  dueDate: string | null,
  position: number,
  checklists: unknown[],
  links: unknown[],
  sourceChannel: string
): Promise<string> {
  const d = await getDb();
  const existing = await d.select<SqlRow[]>('SELECT id FROM cards WHERE trello_id = ?', [trelloId]);
  const labelsJson = JSON.stringify(labels);
  const checklistsJson = JSON.stringify(checklists);
  const linksJson = JSON.stringify(links);

  if (existing.length > 0) {
    await d.execute(
      `UPDATE cards SET column_id = ?, title = ?, description = ?, priority = ?,
       labels = ?, due_date = ?, position = ?, checklists = ?, links = ?,
       source_channel = ? WHERE trello_id = ?`,
      [
        columnId,
        title,
        description,
        priority,
        labelsJson,
        dueDate,
        position,
        checklistsJson,
        linksJson,
        sourceChannel,
        trelloId,
      ]
    );
    return String(existing[0].id);
  }
  const id = crypto.randomUUID();
  await d.execute(
    `INSERT INTO cards (id, column_id, title, description, priority, labels,
     source_channel, due_date, position, created_at, trello_id, checklists, links)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      columnId,
      title,
      description,
      priority,
      labelsJson,
      sourceChannel,
      dueDate,
      position,
      Date.now(),
      trelloId,
      checklistsJson,
      linksJson,
    ]
  );
  return id;
}

async function deleteRemovedCards(boardTrelloId: string, keepTrelloIds: string[]) {
  const d = await getDb();
  const board = await d.select<SqlRow[]>('SELECT id FROM boards WHERE trello_id = ?', [boardTrelloId]);
  if (board.length === 0) return 0;
  const boardId = String(board[0].id);
  const columns = await d.select<SqlRow[]>('SELECT id FROM columns WHERE board_id = ?', [boardId]);
  if (columns.length === 0) return 0;
  const colIds = columns.map((c) => c.id);
  const placeholders = colIds.map(() => '?').join(',');

  const existingCards = await d.select<SqlRow[]>(
    `SELECT id, trello_id FROM cards WHERE column_id IN (${placeholders}) AND trello_id IS NOT NULL`,
    colIds
  );

  let deleted = 0;
  for (const card of existingCards) {
    const trelloId = String(card.trello_id);
    if (!keepTrelloIds.includes(trelloId)) {
      await d.execute('DELETE FROM cards WHERE id = ?', [card.id]);
      deleted++;
    }
  }
  return deleted;
}

async function deleteRemovedColumns(boardTrelloId: string, keepTrelloIds: string[]) {
  const d = await getDb();
  const board = await d.select<SqlRow[]>('SELECT id FROM boards WHERE trello_id = ?', [boardTrelloId]);
  if (board.length === 0) return;
  const boardId = String(board[0].id);
  const existingCols = await d.select<SqlRow[]>(
    'SELECT id, trello_id FROM columns WHERE board_id = ? AND trello_id IS NOT NULL',
    [boardId]
  );
  for (const col of existingCols) {
    const trelloId = String(col.trello_id);
    if (!keepTrelloIds.includes(trelloId)) {
      await d.execute('DELETE FROM cards WHERE column_id = ?', [col.id]);
      await d.execute('DELETE FROM columns WHERE id = ?', [col.id]);
    }
  }
}

// ── Pull Sync Logic (Trello -> local) ──────────────

export async function syncBoard(
  boardId: string,
  key: string,
  token: string,
  options?: { onlyListId?: string | null }
): Promise<{ cards: number; columns: number }> {
  const full: TrelloBoardFull = await getBoardFull(boardId, key, token);
  const onlyListId = options?.onlyListId || null;

  const board = mapBoard(full.board);
  const nexusBoardId = await upsertBoard(board.trello_id, board.title, board.description);

  const listTrelloIds: string[] = [];
  const columnMap = new Map<string, string>();
  const filteredLists = onlyListId
    ? full.lists.filter((list) => list.id === onlyListId)
    : full.lists;
  for (let i = 0; i < filteredLists.length; i++) {
    const col = mapList(filteredLists[i], i);
    const nexusColId = await upsertColumn(col.trello_id, nexusBoardId, col.title, col.position, col.color);
    columnMap.set(col.trello_id, nexusColId);
    listTrelloIds.push(col.trello_id);
  }

  const cardTrelloIds: string[] = [];
  const cardsByList = new Map<string, typeof full.cards>();
  const filteredCards = onlyListId
    ? full.cards.filter((card) => card.idList === onlyListId)
    : full.cards;
  for (const card of filteredCards) {
    const list = cardsByList.get(card.idList) || [];
    list.push(card);
    cardsByList.set(card.idList, list);
  }

  for (const [listId, cards] of cardsByList) {
    const nexusColId = columnMap.get(listId);
    if (!nexusColId) continue;
    cards.sort((a, b) => a.pos - b.pos);
    for (let i = 0; i < cards.length; i++) {
      const mapped = mapCard(cards[i], full.checklists, i);
      await upsertCard(
        mapped.trello_id,
        nexusColId,
        mapped.title,
        mapped.description,
        mapped.priority,
        mapped.labels,
        mapped.due_date,
        mapped.position,
        mapped.checklists,
        mapped.links,
        mapped.source_channel
      );
      cardTrelloIds.push(mapped.trello_id);
    }
  }

  // For bridge-mode (single list), do not delete other local columns/cards.
  // This prevents accidental data loss when syncing a scoped inbox list.
  if (!onlyListId) {
    await deleteRemovedCards(boardId, cardTrelloIds);
    await deleteRemovedColumns(boardId, listTrelloIds);
  }

  return { cards: cardTrelloIds.length, columns: listTrelloIds.length };
}

export async function syncAllBoards(): Promise<{ boards: number; cards: number }> {
  const creds = await getTrelloCredentials();
  if (!creds) throw new Error('No Trello credentials configured');

  const boardIds = await getSyncedBoardIds();
  const bridge = await getWorkspaceInboxBridgeConfig();
  const combinedBoardIds = [...boardIds];
  if (bridge.boardId && !combinedBoardIds.includes(bridge.boardId)) {
    combinedBoardIds.push(bridge.boardId);
  }
  if (combinedBoardIds.length === 0) throw new Error('No boards selected for sync');

  const importedFromInbox = await importWorkspaceInboxToBridgeList(creds.key, creds.token, bridge);

  let totalCards = 0;
  for (const boardId of combinedBoardIds) {
    const bridgeOnlyBoard = !!bridge.boardId && boardId === bridge.boardId && !boardIds.includes(boardId);
    const result = await syncBoard(
      boardId,
      creds.key,
      creds.token,
      bridgeOnlyBoard ? { onlyListId: bridge.listId } : undefined
    );
    totalCards += result.cards;
  }

  await saveSetting('trello_last_sync', new Date().toISOString());
  return { boards: combinedBoardIds.length, cards: totalCards + importedFromInbox };
}

// ── Push Queue (local -> Trello) ───────────────────

type QueueStatus = 'pending' | 'processing' | 'done' | 'failed';
type QueueAction = 'create' | 'update' | 'move' | 'delete';

interface QueueRow {
  id: string;
  action: QueueAction;
  card_id: string | null;
  payload: string;
  status: QueueStatus;
  retry_count: number;
  created_at: number;
}

interface CardSyncContext {
  id: string;
  trelloCardId: string | null;
  title: string;
  description: string;
  dueDate: string | null;
  isDone: boolean;
  position: number;
  columnId: string;
  trelloListId: string | null;
  trelloBoardId: string | null;
}

let queueReady = false;

async function ensurePushQueueTable() {
  if (queueReady) return;
  const d = await getDb();
  await d.execute(`CREATE TABLE IF NOT EXISTS trello_sync_queue (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    card_id TEXT,
    payload TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`);
  await d.execute('CREATE INDEX IF NOT EXISTS idx_trello_sync_queue_status_created ON trello_sync_queue(status, created_at)');
  queueReady = true;
}

async function enqueueAction(action: QueueAction, cardId: string | null, payload: Record<string, unknown>) {
  await ensurePushQueueTable();
  const d = await getDb();
  const now = Date.now();
  await d.execute(
    'INSERT INTO trello_sync_queue (id, action, card_id, payload, status, retry_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
    [crypto.randomUUID(), action, cardId, JSON.stringify(payload), 'pending', now, now]
  );
}

export async function queueTrelloCardCreate(cardId: string) {
  await enqueueAction('create', cardId, {});
}

export async function queueTrelloCardUpdate(cardId: string, changedFields: string[]) {
  await enqueueAction('update', cardId, { changedFields });
}

export async function queueTrelloCardMove(cardId: string, toColumnId: string, position: number) {
  await enqueueAction('move', cardId, { toColumnId, position });
}

export async function queueTrelloCardDelete(trelloCardId: string | null, localCardId?: string) {
  await enqueueAction('delete', localCardId || null, { trelloCardId });
}

async function setQueueStatus(id: string, status: QueueStatus, error?: string) {
  const d = await getDb();
  if (status === 'failed') {
    await d.execute(
      'UPDATE trello_sync_queue SET status = ?, retry_count = retry_count + 1, last_error = ?, updated_at = ? WHERE id = ?',
      [status, error || 'Unknown error', Date.now(), id]
    );
    return;
  }
  await d.execute('UPDATE trello_sync_queue SET status = ?, last_error = ?, updated_at = ? WHERE id = ?', [
    status,
    error || null,
    Date.now(),
    id,
  ]);
}

async function getCardSyncContext(cardId: string): Promise<CardSyncContext | null> {
  const d = await getDb();
  const rows = await d.select<SqlRow[]>(
    `SELECT c.id, c.trello_id AS card_trello_id, c.title, c.description, c.due_date, c.is_done, c.position,
            col.id AS column_id, col.trello_id AS list_trello_id,
            b.trello_id AS board_trello_id
     FROM cards c
     JOIN columns col ON col.id = c.column_id
     JOIN boards b ON b.id = col.board_id
     WHERE c.id = ?
     LIMIT 1`,
    [cardId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: asString(row.id),
    trelloCardId: asNullableString(row.card_trello_id),
    title: asString(row.title),
    description: asString(row.description),
    dueDate: asNullableString(row.due_date),
    isDone: !!row.is_done,
    position: asNumber(row.position),
    columnId: asString(row.column_id),
    trelloListId: asNullableString(row.list_trello_id),
    trelloBoardId: asNullableString(row.board_trello_id),
  };
}

async function processCreate(queueItem: QueueRow, key: string, token: string): Promise<'done' | 'skipped'> {
  if (!queueItem.card_id) return 'skipped';
  const ctx = await getCardSyncContext(queueItem.card_id);
  if (!ctx || !ctx.trelloListId || !ctx.trelloBoardId) return 'skipped';
  if (ctx.trelloCardId) {
    await updateTrelloCard(
      ctx.trelloCardId,
      {
        name: ctx.title,
        desc: ctx.description,
        due: ctx.dueDate,
        dueComplete: ctx.dueDate ? ctx.isDone : undefined,
      },
      key,
      token
    );
    return 'done';
  }

  const created = await createTrelloCard(
    {
      idList: ctx.trelloListId,
      name: ctx.title,
      desc: ctx.description,
      due: ctx.dueDate,
      pos: ctx.position,
    },
    key,
    token
  );

  const d = await getDb();
  await d.execute('UPDATE cards SET trello_id = ? WHERE id = ?', [created.id, ctx.id]);
  return 'done';
}

async function processUpdate(queueItem: QueueRow, key: string, token: string): Promise<'done' | 'skipped'> {
  if (!queueItem.card_id) return 'skipped';
  const ctx = await getCardSyncContext(queueItem.card_id);
  if (!ctx || !ctx.trelloListId || !ctx.trelloBoardId) return 'skipped';

  let trelloCardId = ctx.trelloCardId;
  if (!trelloCardId) {
    const created = await createTrelloCard(
      {
        idList: ctx.trelloListId,
        name: ctx.title,
        desc: ctx.description,
        due: ctx.dueDate,
        pos: ctx.position,
      },
      key,
      token
    );
    trelloCardId = created.id;
    const d = await getDb();
    await d.execute('UPDATE cards SET trello_id = ? WHERE id = ?', [trelloCardId, ctx.id]);
  }

  await updateTrelloCard(
    trelloCardId,
    {
      name: ctx.title,
      desc: ctx.description,
      due: ctx.dueDate,
      dueComplete: ctx.dueDate ? ctx.isDone : undefined,
    },
    key,
    token
  );
  return 'done';
}

async function processMove(queueItem: QueueRow, key: string, token: string): Promise<'done' | 'skipped'> {
  if (!queueItem.card_id) return 'skipped';
  const ctx = await getCardSyncContext(queueItem.card_id);
  if (!ctx || !ctx.trelloListId || !ctx.trelloBoardId) return 'skipped';

  const payload = (() => {
    try {
      return JSON.parse(queueItem.payload) as { toColumnId?: string; position?: number };
    } catch {
      return {};
    }
  })();

  let targetListId = ctx.trelloListId;
  if (typeof payload.toColumnId === 'string' && payload.toColumnId) {
    const d = await getDb();
    const rows = await d.select<SqlRow[]>('SELECT trello_id FROM columns WHERE id = ? LIMIT 1', [payload.toColumnId]);
    const maybe = asNullableString(rows[0]?.trello_id);
    if (maybe) targetListId = maybe;
  }
  if (!targetListId) return 'skipped';

  let trelloCardId = ctx.trelloCardId;
  if (!trelloCardId) {
    const created = await createTrelloCard(
      {
        idList: targetListId,
        name: ctx.title,
        desc: ctx.description,
        due: ctx.dueDate,
        pos: typeof payload.position === 'number' ? payload.position : ctx.position,
      },
      key,
      token
    );
    trelloCardId = created.id;
    const d = await getDb();
    await d.execute('UPDATE cards SET trello_id = ? WHERE id = ?', [trelloCardId, ctx.id]);
    return 'done';
  }

  await moveTrelloCard(
    trelloCardId,
    {
      idList: targetListId,
      pos: typeof payload.position === 'number' ? payload.position : 'bottom',
    },
    key,
    token
  );
  return 'done';
}

async function processDelete(queueItem: QueueRow, key: string, token: string): Promise<'done' | 'skipped'> {
  const payload = (() => {
    try {
      return JSON.parse(queueItem.payload) as { trelloCardId?: string };
    } catch {
      return {};
    }
  })();
  if (!payload.trelloCardId) return 'skipped';
  await deleteTrelloCard(payload.trelloCardId, key, token);
  return 'done';
}

export async function pushQueuedLocalChanges(limit = 100): Promise<{ processed: number; pushed: number; failed: number; skipped: number }> {
  await ensurePushQueueTable();
  const creds = await getTrelloCredentials();
  if (!creds) throw new Error('No Trello credentials configured');

  const d = await getDb();
  const queue = await d.select<QueueRow[]>(
    `SELECT id, action, card_id, payload, status, retry_count, created_at
     FROM trello_sync_queue
     WHERE status IN ('pending', 'failed')
     ORDER BY created_at ASC
     LIMIT ?`,
    [limit]
  );

  let processed = 0;
  let pushed = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of queue) {
    processed += 1;
    await setQueueStatus(item.id, 'processing');
    try {
      const action = item.action;
      let result: 'done' | 'skipped' = 'skipped';
      if (action === 'create') result = await processCreate(item, creds.key, creds.token);
      if (action === 'update') result = await processUpdate(item, creds.key, creds.token);
      if (action === 'move') result = await processMove(item, creds.key, creds.token);
      if (action === 'delete') result = await processDelete(item, creds.key, creds.token);

      if (result === 'done') pushed += 1;
      else skipped += 1;
      await setQueueStatus(item.id, 'done');
    } catch (e) {
      failed += 1;
      const msg = e instanceof Error ? e.message : 'Unknown push error';
      await setQueueStatus(item.id, 'failed', msg);
    }
  }

  return { processed, pushed, failed, skipped };
}

// ── Polling ───────────────────────────────────────

export function startAutoSync(intervalMs = DEFAULT_SYNC_INTERVAL_MS) {
  if (syncInterval) return;
  runSync();
  syncInterval = setInterval(runSync, intervalMs);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

export function isAutoSyncRunning() {
  return syncInterval !== null;
}

async function runSync() {
  if (syncing) return;
  syncing = true;
  emit({ status: 'syncing', message: 'Đang đồng bộ...' });

  try {
    const pushResult = await pushQueuedLocalChanges();
    let pullBoards = 0;
    let pullCards = 0;
    try {
      const result = await syncAllBoards();
      pullBoards = result.boards;
      pullCards = result.cards;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi pull';
      if (!msg.includes('No boards selected for sync')) throw e;
    }

    const now = new Date().toLocaleString('vi-VN');
    emit({
      status: 'success',
      message: `Push ${pushResult.pushed}/${pushResult.processed}, Pull ${pullCards} cards`,
      boardCount: pullBoards,
      cardCount: pullCards,
      lastSync: now,
    });
  } catch (e: unknown) {
    emit({ status: 'error', message: e instanceof Error ? e.message : 'Lỗi đồng bộ' });
  } finally {
    syncing = false;
  }
}
