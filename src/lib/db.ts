import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;
type SqlValue = string | number | null;
type SqlRow = Record<string, SqlValue | undefined>;

interface BoardRow {
  id: string;
  title: string;
  description: string | null;
  trello_id: string | null;
  created_at: number | null;
  updated_at: number | null;
}

interface ColumnRow {
  id: string;
  board_id: string;
  title: string;
  color: string | null;
  position: number | null;
  trello_id: string | null;
}

interface CardRow {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: string | null;
  labels: string | null;
  due_date: string | null;
  checklists: string | null;
  links: string | null;
  attachments: string | null;
  source_channel: string | null;
  position: number | null;
  trello_id: string | null;
  is_done: number | null;
}

export interface DbCard extends Omit<CardRow, 'labels' | 'checklists' | 'links' | 'attachments' | 'is_done'> {
  labels: string[];
  checklists: unknown[];
  links: unknown[];
  attachments: unknown[];
  is_done: boolean;
}

export interface DbColumn extends ColumnRow {
  position: number | null;
  cards: DbCard[];
}

export interface DbBoard extends BoardRow {
  columns: DbColumn[];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseJsonArray<T = unknown>(raw: unknown): T[] {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:nexus.db');
  }
  return db;
}

// ── Boards ──────────────────────────────────────────
export async function getBoards(): Promise<DbBoard[]> {
  const d = await getDb();
  const boards = await d.select<BoardRow[]>('SELECT * FROM boards ORDER BY created_at DESC');
  const result: DbBoard[] = [];
  for (const board of boards) {
    const cols = await d.select<ColumnRow[]>(
      'SELECT * FROM columns WHERE board_id = ? ORDER BY position',
      [board.id]
    );
    const columnsWithCards: DbColumn[] = [];
    for (const col of cols) {
      const cards = await d.select<CardRow[]>(
        'SELECT * FROM cards WHERE column_id = ? ORDER BY position',
        [col.id]
      );
      columnsWithCards.push({
        ...col,
        position: asNumber(col.position),
          cards: cards.map((c) => ({
            ...c,
            labels: parseJsonArray<string>(c.labels),
            checklists: parseJsonArray(c.checklists),
            links: parseJsonArray(c.links),
            attachments: parseJsonArray(c.attachments),
            is_done: !!c.is_done,
          })),
      });
    }
    result.push({
      ...board,
      id: asString(board.id),
      title: asString(board.title),
      description: asString(board.description, ''),
      columns: columnsWithCards,
    });
  }
  return result;
}

export async function createBoard(title: string, description = '') {
  const d = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await d.execute(
    'INSERT INTO boards (id, title, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, title, description, now, now]
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
  return id;
}

// ── Cards ───────────────────────────────────────────
export async function createCard(columnId: string, title: string, description = '', priority = 'medium', labels: string[] = [], sourceChannel = 'manual') {
  const d = await getDb();
  const id = crypto.randomUUID();
  const count = await d.select<SqlRow[]>('SELECT COUNT(*) as c FROM cards WHERE column_id = ?', [columnId]);
  const position = count[0]?.c || 0;
  await d.execute(
    'INSERT INTO cards (id, column_id, title, description, priority, labels, source_channel, position, created_at, is_done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, columnId, title, description, priority, JSON.stringify(labels), sourceChannel, position, Date.now(), 0]
  );
  return id;
}

export async function moveCard(cardId: string, newColumnId: string, newPosition: number) {
  const d = await getDb();
  await d.execute('UPDATE cards SET column_id = ?, position = ? WHERE id = ?', [newColumnId, newPosition, cardId]);
}

export async function deleteCard(cardId: string) {
  const d = await getDb();
  await d.execute('DELETE FROM cards WHERE id = ?', [cardId]);
}

export async function updateCard(cardId: string, updates: {
  title?: string; description?: string; priority?: string;
  labels?: string[]; due_date?: string | null;
  checklists?: unknown[]; links?: unknown[]; attachments?: unknown[];
  is_done?: boolean;
}) {
  const d = await getDb();
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];
  if (updates.title !== undefined) { sets.push('title = ?'); vals.push(updates.title); }
  if (updates.description !== undefined) { sets.push('description = ?'); vals.push(updates.description); }
  if (updates.priority !== undefined) { sets.push('priority = ?'); vals.push(updates.priority); }
  if (updates.labels !== undefined) { sets.push('labels = ?'); vals.push(JSON.stringify(updates.labels)); }
  if (updates.due_date !== undefined) { sets.push('due_date = ?'); vals.push(updates.due_date); }
  if (updates.checklists !== undefined) { sets.push('checklists = ?'); vals.push(JSON.stringify(updates.checklists)); }
  if (updates.links !== undefined) { sets.push('links = ?'); vals.push(JSON.stringify(updates.links)); }
  if (updates.attachments !== undefined) { sets.push('attachments = ?'); vals.push(JSON.stringify(updates.attachments)); }
  if (updates.is_done !== undefined) { sets.push('is_done = ?'); vals.push(updates.is_done ? 1 : 0); }
  if (sets.length === 0) return;
  vals.push(cardId);
  await d.execute(`UPDATE cards SET ${sets.join(', ')} WHERE id = ?`, vals);
}

// ── Messages ────────────────────────────────────────
export async function getMessages(channelType?: string, limit = 50) {
  const d = await getDb();
  if (channelType) {
    return d.select<SqlRow[]>(
      'SELECT * FROM messages WHERE channel_type = ? ORDER BY timestamp DESC LIMIT ?',
      [channelType, limit]
    );
  }
  return d.select<SqlRow[]>('SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?', [limit]);
}

export async function saveMessage(msg: {
  id: string; channelType: string; channelId: string; senderName: string;
  senderEmail?: string; subject?: string; body: string; timestamp: number;
  isRead?: boolean; metadata?: string;
}) {
  const d = await getDb();
  await d.execute(
    'INSERT OR IGNORE INTO messages (id, channel_type, channel_id, sender_name, sender_email, subject, body, timestamp, is_read, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [msg.id, msg.channelType, msg.channelId, msg.senderName, msg.senderEmail || null, msg.subject || null, msg.body, msg.timestamp, msg.isRead ? 1 : 0, msg.metadata || '{}']
  );
}

// ── Channels Config ─────────────────────────────────
export async function getChannelConfig(type: string) {
  const d = await getDb();
  const rows = await d.select<SqlRow[]>('SELECT * FROM channels WHERE type = ? LIMIT 1', [type]);
  return rows[0] || null;
}

export async function saveChannelConfig(type: string, name: string, config: Record<string, string>) {
  const d = await getDb();
  const id = crypto.randomUUID();
  await d.execute(
    'INSERT OR REPLACE INTO channels (id, type, name, config, is_active) VALUES (?, ?, ?, ?, 1)',
    [id, type, name, JSON.stringify(config)]
  );
}

// ── Seed Demo Data ──────────────────────────────────
export async function seedDemoData() {
  const d = await getDb();
  const existing = await d.select<SqlRow[]>('SELECT COUNT(*) as c FROM boards');
  if (Number(existing[0]?.c || 0) > 0) return;

  await createBoard('Project Alpha', 'Main project board');
  // Board created with empty columns: To Do, In Progress, Review, Done
}

// ── Clear all cards (keep columns) ──────────────────
export async function clearAllCards() {
  const d = await getDb();
  await d.execute('DELETE FROM cards');
}

// ── Settings (key-value) ────────────────────────────
let _settingsTableReady = false;
async function ensureSettingsTable() {
  if (_settingsTableReady) return;
  const d = await getDb();
  await d.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  _settingsTableReady = true;
}

export async function getSetting(key: string): Promise<string | null> {
  try {
    await ensureSettingsTable();
    const d = await getDb();
    const rows = await d.select<SqlRow[]>('SELECT value FROM settings WHERE key = ?', [key]);
    return typeof rows[0]?.value === 'string' ? rows[0].value : null;
  } catch (e) {
    console.error('getSetting error:', e);
    return null;
  }
}

export async function saveSetting(key: string, value: string): Promise<void> {
  try {
    await ensureSettingsTable();
    const d = await getDb();
    await d.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  } catch (e) {
    console.error('saveSetting error:', e);
    throw e; // re-throw so UI can catch
  }
}

export async function deleteSetting(key: string): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM settings WHERE key = ?', [key]);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const d = await getDb();
  try {
    const rows = await d.select<SqlRow[]>('SELECT key, value FROM settings');
    const result: Record<string, string> = {};
    for (const row of rows) {
      if (typeof row.key === 'string' && typeof row.value === 'string') {
        result[row.key] = row.value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

// ── Board AI Chat History ───────────────────────────
export interface BoardAiMessage {
  id: string;
  board_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: string;
  created_at: number;
}

let _boardAiTableReady = false;
async function ensureBoardAiTable() {
  if (_boardAiTableReady) return;
  const d = await getDb();
  await d.execute(`CREATE TABLE IF NOT EXISTS board_ai_messages (
    id TEXT PRIMARY KEY,
    board_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
  )`);
  await d.execute(
    'CREATE INDEX IF NOT EXISTS idx_board_ai_messages_board_created_at ON board_ai_messages(board_id, created_at)'
  );
  _boardAiTableReady = true;
}

export async function getBoardAiMessages(boardId: string, limit = 100): Promise<BoardAiMessage[]> {
  await ensureBoardAiTable();
  const d = await getDb();
  const rows = await d.select<BoardAiMessage[]>(
    `SELECT id, board_id, role, content, metadata, created_at
     FROM board_ai_messages
     WHERE board_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [boardId, limit]
  );
  return [...rows].reverse();
}

export async function saveBoardAiMessage(input: {
  board_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string;
}): Promise<string> {
  await ensureBoardAiTable();
  const d = await getDb();
  const id = crypto.randomUUID();
  await d.execute(
    'INSERT INTO board_ai_messages (id, board_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.board_id, input.role, input.content, input.metadata || '{}', Date.now()]
  );
  return id;
}

// ── Gmail Accounts ──────────────────────────────────
export interface GmailAccount {
  id: string;
  email: string;
  name: string;
  photo: string;
  client_id: string;
  client_secret_enc: string;
  refresh_token_enc: string;
  access_token_enc: string;
  token_expiry: number;
  color: string;
  created_at: number;
}

export interface GmailEmail {
  id: string;
  gmail_id: string;
  account_id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  snippet: string;
  body: string;
  category: string;
  timestamp: number;
  is_read: boolean;
  labels: string;
}

const ACCOUNT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

let _gmailTablesReady = false;
async function ensureGmailTables() {
  if (_gmailTablesReady) return;
  const d = await getDb();
  await d.execute(`CREATE TABLE IF NOT EXISTS gmail_accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT DEFAULT '',
    photo TEXT DEFAULT '',
    client_id TEXT NOT NULL,
    client_secret_enc TEXT NOT NULL,
    refresh_token_enc TEXT DEFAULT '',
    access_token_enc TEXT DEFAULT '',
    token_expiry INTEGER DEFAULT 0,
    color TEXT DEFAULT '#3b82f6',
    created_at INTEGER
  )`);
  await d.execute(`CREATE TABLE IF NOT EXISTS gmail_emails (
    id TEXT PRIMARY KEY,
    gmail_id TEXT,
    account_id TEXT DEFAULT '',
    subject TEXT,
    sender_name TEXT,
    sender_email TEXT,
    snippet TEXT,
    body TEXT,
    category TEXT DEFAULT '',
    timestamp INTEGER,
    is_read INTEGER DEFAULT 0,
    labels TEXT DEFAULT '',
    UNIQUE(gmail_id, account_id)
  )`);
  _gmailTablesReady = true;
}

// ── Account CRUD ─────────────────────────────────────
export async function getGmailAccounts(): Promise<GmailAccount[]> {
  await ensureGmailTables();
  const d = await getDb();
  return d.select<GmailAccount[]>('SELECT * FROM gmail_accounts ORDER BY created_at ASC');
}

export async function getGmailAccount(id: string): Promise<GmailAccount | null> {
  await ensureGmailTables();
  const d = await getDb();
  const rows = await d.select<GmailAccount[]>('SELECT * FROM gmail_accounts WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function saveGmailAccount(account: GmailAccount): Promise<void> {
  await ensureGmailTables();
  const d = await getDb();
  await d.execute(
    `INSERT OR REPLACE INTO gmail_accounts (id, email, name, photo, client_id, client_secret_enc, refresh_token_enc, access_token_enc, token_expiry, color, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [account.id, account.email, account.name, account.photo, account.client_id,
     account.client_secret_enc, account.refresh_token_enc, account.access_token_enc,
     account.token_expiry, account.color, account.created_at]
  );
}

export async function deleteGmailAccount(id: string): Promise<void> {
  await ensureGmailTables();
  const d = await getDb();
  await d.execute('DELETE FROM gmail_emails WHERE account_id = ?', [id]);
  await d.execute('DELETE FROM gmail_accounts WHERE id = ?', [id]);
}

export function getNextAccountColor(existingCount: number): string {
  return ACCOUNT_COLORS[existingCount % ACCOUNT_COLORS.length];
}

// ── Gmail Emails (multi-account) ─────────────────────
export async function saveGmailEmails(emails: GmailEmail[]): Promise<void> {
  await ensureGmailTables();
  const d = await getDb();
  for (const e of emails) {
    await d.execute(
      `INSERT OR REPLACE INTO gmail_emails (id, gmail_id, account_id, subject, sender_name, sender_email, snippet, body, category, timestamp, is_read, labels)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.id, e.gmail_id, e.account_id, e.subject, e.sender_name, e.sender_email, e.snippet, e.body, e.category, e.timestamp, e.is_read ? 1 : 0, e.labels]
    );
  }
}

export async function getGmailEmails(accountId?: string, limit = 100): Promise<GmailEmail[]> {
  await ensureGmailTables();
  const d = await getDb();
  let rows: GmailEmail[];
  if (accountId && accountId !== 'all') {
    rows = await d.select<GmailEmail[]>(
      'SELECT * FROM gmail_emails WHERE account_id = ? ORDER BY timestamp DESC LIMIT ?',
      [accountId, limit]
    );
  } else {
    rows = await d.select<GmailEmail[]>(
      'SELECT * FROM gmail_emails ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }
  return rows.map(r => ({ ...r, is_read: !!r.is_read }));
}

export async function getGmailUnreadCount(accountId?: string): Promise<number> {
  await ensureGmailTables();
  const d = await getDb();
  if (accountId && accountId !== 'all') {
    const rows = await d.select<SqlRow[]>('SELECT COUNT(*) as c FROM gmail_emails WHERE is_read = 0 AND account_id = ?', [accountId]);
    return Number(rows[0]?.c || 0);
  }
  const rows = await d.select<SqlRow[]>('SELECT COUNT(*) as c FROM gmail_emails WHERE is_read = 0');
  return Number(rows[0]?.c || 0);
}
