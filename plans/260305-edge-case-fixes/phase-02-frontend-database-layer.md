# Phase 02: Frontend Database Layer

> Parent plan: [plan.md](./plan.md)  
> Dependencies: None  
> Parallelization: Group A — runs concurrently with Phases 01, 03, 04

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-03-05 |
| Priority | P1 (High) |
| Status | pending |
| Effort | 1.5h |

## Edge Cases Fixed

| # | Edge Case | Severity |
|---|-----------|----------|
| 5 | `clearAllCards()` — permanent deletion, no undo | Critical |
| 12 | N+1 query in `getBoards()` | High |
| 19 | No transaction in `createBoard` | Medium |
| 20 | Race condition in `createCard` position | Medium |
| 21 | `deleteGmailAccount` non-transactional | Medium |
| 22 | `saveGmailEmails` sequential 1-by-1 inserts | Medium |
| 23 | Settings table lazy-creation race | Medium |
| 24 | Singleton DB never closed | Medium |
| 33 | Concurrent `moveCard` no locking | Medium |
| 34 | No input validation on card/board creation | Medium |
| 35 | `updateCard` silent no-op on empty updates | Low |

## File Ownership (Exclusive)

- `src/lib/db.ts` (sole owner)

## Implementation Steps

### Step 1: Fix N+1 in `getBoards()` (lines 91-128)

Replace nested loop with 2 JOINed queries:
```typescript
export async function getBoards(): Promise<DbBoard[]> {
  const d = await getDb();
  const boards = await d.select<BoardRow[]>('SELECT * FROM boards ORDER BY created_at DESC');
  if (boards.length === 0) return [];

  const boardIds = boards.map(b => b.id);
  const placeholders = boardIds.map(() => '?').join(',');
  
  const allCols = await d.select<ColumnRow[]>(
    `SELECT * FROM columns WHERE board_id IN (${placeholders}) ORDER BY position`,
    boardIds
  );
  const allCards = await d.select<(CardRow & { col_board_id: string })[]>(
    `SELECT c.*, col.board_id as col_board_id FROM cards c 
     JOIN columns col ON c.column_id = col.id 
     WHERE col.board_id IN (${placeholders}) ORDER BY c.position`,
    boardIds
  );
  
  // Group in-memory
  const cardsByCol = new Map<string, DbCard[]>();
  for (const c of allCards) {
    const arr = cardsByCol.get(c.column_id) || [];
    arr.push(mapCardRow(c));
    cardsByCol.set(c.column_id, arr);
  }
  // ... assemble boards
}
```

### Step 2: Add transaction wrapping to `createBoard` (lines 130-151)

```typescript
export async function createBoard(title: string, description = '') {
  if (!title.trim()) throw new Error('Board title cannot be empty');
  if (title.length > 200) throw new Error('Board title too long (max 200 chars)');
  
  const d = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  
  await d.execute('BEGIN TRANSACTION');
  try {
    await d.execute(
      'INSERT INTO boards (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, title.trim(), description, now, now]
    );
    const defaultCols = [
      { title: '📥 To Do', color: '#6366f1', position: 0 },
      { title: '🔄 In Progress', color: '#f59e0b', position: 1 },
      { title: '👀 Review', color: '#8b5cf6', position: 2 },
      { title: '✅ Done', color: '#22c55e', position: 3 },
    ];
    for (const col of defaultCols) {
      await d.execute(
        'INSERT INTO columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)',
        [crypto.randomUUID(), id, col.title, col.position, col.color]
      );
    }
    await d.execute('COMMIT');
  } catch (e) {
    await d.execute('ROLLBACK');
    throw e;
  }
  return id;
}
```

### Step 3: Fix `createCard` position race (lines 154-164)

Use `MAX(position)` + transaction:
```typescript
export async function createCard(columnId: string, title: string, description = '', priority = 'medium', labels: string[] = [], sourceChannel = 'manual') {
  if (!title.trim()) throw new Error('Card title cannot be empty');
  if (title.length > 500) throw new Error('Card title too long (max 500 chars)');
  
  const d = await getDb();
  const id = crypto.randomUUID();
  
  await d.execute('BEGIN TRANSACTION');
  try {
    const maxPos = await d.select<SqlRow[]>(
      'SELECT COALESCE(MAX(position), -1) as max_pos FROM cards WHERE column_id = ?', [columnId]
    );
    const position = Number(maxPos[0]?.max_pos ?? -1) + 1;
    await d.execute(
      'INSERT INTO cards (id, column_id, title, description, priority, labels, source_channel, position, created_at, is_done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, columnId, title.trim(), description, priority, JSON.stringify(labels), sourceChannel, position, Date.now(), 0]
    );
    await d.execute('COMMIT');
  } catch (e) {
    await d.execute('ROLLBACK');
    throw e;
  }
  return id;
}
```

### Step 4: Fix `clearAllCards` — add soft-delete or return count

```typescript
export async function clearAllCards(): Promise<number> {
  const d = await getDb();
  const countResult = await d.select<SqlRow[]>('SELECT COUNT(*) as c FROM cards');
  const count = Number(countResult[0]?.c || 0);
  if (count === 0) return 0;
  await d.execute('DELETE FROM cards');
  return count;
}
```

### Step 5: Fix `deleteGmailAccount` — wrap in transaction

```typescript
export async function deleteGmailAccount(id: string): Promise<void> {
  const d = await getDb();
  await d.execute('BEGIN TRANSACTION');
  try {
    await d.execute('DELETE FROM gmail_emails WHERE account_id = ?', [id]);
    await d.execute('DELETE FROM gmail_accounts WHERE id = ?', [id]);
    await d.execute('COMMIT');
  } catch (e) {
    await d.execute('ROLLBACK');
    throw e;
  }
}
```

### Step 6: Batch `saveGmailEmails`

```typescript
export async function saveGmailEmails(emails: GmailEmail[]): Promise<void> {
  if (emails.length === 0) return;
  const d = await getDb();
  await d.execute('BEGIN TRANSACTION');
  try {
    for (const e of emails) {
      await d.execute(
        `INSERT OR REPLACE INTO gmail_emails (...) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [/* ... same params ... */]
      );
    }
    await d.execute('COMMIT');
  } catch (err) {
    await d.execute('ROLLBACK');
    throw err;
  }
}
```

### Step 7: Fix settings table race with promise-based singleton

```typescript
let _settingsTablePromise: Promise<void> | null = null;

async function ensureSettingsTable() {
  if (!_settingsTablePromise) {
    _settingsTablePromise = (async () => {
      if (!isTauriAvailable()) return;
      const d = await getDb();
      await d.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    })();
  }
  return _settingsTablePromise;
}
```

Apply same pattern to `ensureBoardAiTable` and `ensureGmailTables`.

### Step 8: Fix `updateCard` — return boolean

```typescript
export async function updateCard(cardId: string, updates: { ... }): Promise<boolean> {
  // ... existing logic ...
  if (sets.length === 0) return false;
  vals.push(cardId);
  await d.execute(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`, vals);
  return true;
}
```

## Conflict Prevention

- Only modifies `src/lib/db.ts` — no overlap with other phases.
- Other phases import from `db.ts` but don't modify its source.

## Success Criteria

- [ ] `getBoards()` uses ≤3 SQL queries regardless of board count
- [ ] `createBoard` rolls back on column insertion failure
- [ ] `createCard` uses transaction for atomic position calculation
- [ ] `clearAllCards` returns count
- [ ] `deleteGmailAccount` is transactional
- [ ] `saveGmailEmails` uses single transaction
- [ ] `ensureSettingsTable` uses promise-based singleton
- [ ] Input validation enforced on `createBoard`/`createCard`
