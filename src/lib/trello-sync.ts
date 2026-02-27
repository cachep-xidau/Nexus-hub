/**
 * Trello Sync Engine for Nexus Hub
 * Polls Trello API and upserts data into local SQLite
 */

import {
    testConnection, getBoards, getBoardFull,
    mapBoard, mapList, mapCard,
    type TrelloBoardFull, type TrelloBoard,
} from './trello-api';
import { getDb } from './db';
import { getSetting, saveSetting } from './db';

// ── Sync State ────────────────────────────────────

let syncInterval: ReturnType<typeof setInterval> | null = null;
let syncing = false;
const listeners: Set<(event: SyncEvent) => void> = new Set();

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncEvent {
    status: SyncStatus;
    message: string;
    boardCount?: number;
    cardCount?: number;
    lastSync?: string;
}

function emit(event: SyncEvent) {
    listeners.forEach(fn => fn(event));
}

export function onSyncEvent(fn: (event: SyncEvent) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
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
    try { return JSON.parse(raw); } catch { return []; }
}

export async function saveSyncedBoardIds(ids: string[]) {
    await saveSetting('trello_board_ids', JSON.stringify(ids));
}

// ── DB Upsert Functions ───────────────────────────

async function upsertBoard(trelloId: string, title: string, description: string): Promise<string> {
    const d = await getDb();
    const existing = await d.select<any[]>('SELECT id FROM boards WHERE trello_id = ?', [trelloId]);
    if (existing.length > 0) {
        await d.execute('UPDATE boards SET title = ?, description = ?, updated_at = ? WHERE trello_id = ?',
            [title, description, Date.now(), trelloId]);
        return existing[0].id;
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    await d.execute(
        'INSERT INTO boards (id, title, description, trello_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, title, description, trelloId, now, now]
    );
    return id;
}

async function upsertColumn(trelloId: string, boardId: string, title: string, position: number, color: string): Promise<string> {
    const d = await getDb();
    const existing = await d.select<any[]>('SELECT id FROM columns WHERE trello_id = ?', [trelloId]);
    if (existing.length > 0) {
        await d.execute('UPDATE columns SET title = ?, position = ?, color = ?, board_id = ? WHERE trello_id = ?',
            [title, position, color, boardId, trelloId]);
        return existing[0].id;
    }
    const id = crypto.randomUUID();
    await d.execute(
        'INSERT INTO columns (id, board_id, title, position, color, trello_id) VALUES (?, ?, ?, ?, ?, ?)',
        [id, boardId, title, position, color, trelloId]
    );
    return id;
}

async function upsertCard(
    trelloId: string, columnId: string, title: string, description: string,
    priority: string, labels: string[], dueDate: string | null, position: number,
    checklists: any[], links: any[], sourceChannel: string
): Promise<string> {
    const d = await getDb();
    const existing = await d.select<any[]>('SELECT id FROM cards WHERE trello_id = ?', [trelloId]);
    const labelsJson = JSON.stringify(labels);
    const checklistsJson = JSON.stringify(checklists);
    const linksJson = JSON.stringify(links);

    if (existing.length > 0) {
        await d.execute(
            `UPDATE cards SET column_id = ?, title = ?, description = ?, priority = ?,
             labels = ?, due_date = ?, position = ?, checklists = ?, links = ?,
             source_channel = ? WHERE trello_id = ?`,
            [columnId, title, description, priority, labelsJson, dueDate, position,
             checklistsJson, linksJson, sourceChannel, trelloId]
        );
        return existing[0].id;
    }
    const id = crypto.randomUUID();
    await d.execute(
        `INSERT INTO cards (id, column_id, title, description, priority, labels,
         source_channel, due_date, position, created_at, trello_id, checklists, links)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, columnId, title, description, priority, labelsJson,
         sourceChannel, dueDate, position, Date.now(), trelloId, checklistsJson, linksJson]
    );
    return id;
}

async function deleteRemovedCards(boardTrelloId: string, keepTrelloIds: string[]) {
    const d = await getDb();
    // Get all columns for this board
    const board = await d.select<any[]>('SELECT id FROM boards WHERE trello_id = ?', [boardTrelloId]);
    if (board.length === 0) return 0;
    const columns = await d.select<any[]>('SELECT id FROM columns WHERE board_id = ?', [board[0].id]);
    if (columns.length === 0) return 0;
    const colIds = columns.map((c: any) => c.id);
    const placeholders = colIds.map(() => '?').join(',');

    // Get all trello cards in these columns
    const existingCards = await d.select<any[]>(
        `SELECT id, trello_id FROM cards WHERE column_id IN (${placeholders}) AND trello_id IS NOT NULL`,
        colIds
    );

    let deleted = 0;
    for (const card of existingCards) {
        if (!keepTrelloIds.includes(card.trello_id)) {
            await d.execute('DELETE FROM cards WHERE id = ?', [card.id]);
            deleted++;
        }
    }
    return deleted;
}

async function deleteRemovedColumns(boardTrelloId: string, keepTrelloIds: string[]) {
    const d = await getDb();
    const board = await d.select<any[]>('SELECT id FROM boards WHERE trello_id = ?', [boardTrelloId]);
    if (board.length === 0) return;
    const existingCols = await d.select<any[]>(
        'SELECT id, trello_id FROM columns WHERE board_id = ? AND trello_id IS NOT NULL',
        [board[0].id]
    );
    for (const col of existingCols) {
        if (!keepTrelloIds.includes(col.trello_id)) {
            await d.execute('DELETE FROM cards WHERE column_id = ?', [col.id]);
            await d.execute('DELETE FROM columns WHERE id = ?', [col.id]);
        }
    }
}

// ── Sync Logic ────────────────────────────────────

export async function syncBoard(boardId: string, key: string, token: string): Promise<{ cards: number; columns: number }> {
    const full: TrelloBoardFull = await getBoardFull(boardId, key, token);

    // 1. Upsert board
    const board = mapBoard(full.board);
    const nexusBoardId = await upsertBoard(board.trello_id, board.title, board.description);

    // 2. Upsert columns (lists)
    const listTrelloIds: string[] = [];
    const columnMap = new Map<string, string>(); // trello list id → nexus column id
    for (let i = 0; i < full.lists.length; i++) {
        const col = mapList(full.lists[i], i);
        const nexusColId = await upsertColumn(col.trello_id, nexusBoardId, col.title, col.position, col.color);
        columnMap.set(col.trello_id, nexusColId);
        listTrelloIds.push(col.trello_id);
    }

    // 3. Upsert cards
    const cardTrelloIds: string[] = [];
    // Group cards by list for position normalization
    const cardsByList = new Map<string, typeof full.cards>();
    for (const card of full.cards) {
        const list = cardsByList.get(card.idList) || [];
        list.push(card);
        cardsByList.set(card.idList, list);
    }

    for (const [listId, cards] of cardsByList) {
        const nexusColId = columnMap.get(listId);
        if (!nexusColId) continue;
        // Sort by Trello position
        cards.sort((a, b) => a.pos - b.pos);
        for (let i = 0; i < cards.length; i++) {
            const mapped = mapCard(cards[i], full.checklists, i);
            await upsertCard(
                mapped.trello_id, nexusColId, mapped.title, mapped.description,
                mapped.priority, mapped.labels, mapped.due_date, mapped.position,
                mapped.checklists, mapped.links, mapped.source_channel
            );
            cardTrelloIds.push(mapped.trello_id);
        }
    }

    // 4. Delete removed items
    await deleteRemovedCards(boardId, cardTrelloIds);
    await deleteRemovedColumns(boardId, listTrelloIds);

    return { cards: cardTrelloIds.length, columns: listTrelloIds.length };
}

export async function syncAllBoards(): Promise<{ boards: number; cards: number }> {
    const creds = await getTrelloCredentials();
    if (!creds) throw new Error('No Trello credentials configured');

    const boardIds = await getSyncedBoardIds();
    if (boardIds.length === 0) throw new Error('No boards selected for sync');

    let totalCards = 0;
    for (const boardId of boardIds) {
        const result = await syncBoard(boardId, creds.key, creds.token);
        totalCards += result.cards;
    }

    await saveSetting('trello_last_sync', new Date().toISOString());
    return { boards: boardIds.length, cards: totalCards };
}

// ── Polling ───────────────────────────────────────

export function startAutoSync(intervalMs = 300_000) {
    if (syncInterval) return;
    // Run immediately
    runSync();
    // Then poll
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
        const result = await syncAllBoards();
        const now = new Date().toLocaleString('vi-VN');
        emit({
            status: 'success',
            message: `Đồng bộ thành công`,
            boardCount: result.boards,
            cardCount: result.cards,
            lastSync: now,
        });
    } catch (e: any) {
        emit({ status: 'error', message: e.message || 'Lỗi đồng bộ' });
    } finally {
        syncing = false;
    }
}
