import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:nexus.db');
  }
  return db;
}

// ── Boards ──────────────────────────────────────────
export async function getBoards() {
  const d = await getDb();
  const boards = await d.select<any[]>('SELECT * FROM boards ORDER BY created_at DESC');
  const result = [];
  for (const board of boards) {
    const cols = await d.select<any[]>(
      'SELECT * FROM columns WHERE board_id = ? ORDER BY position',
      [board.id]
    );
    const columnsWithCards = [];
    for (const col of cols) {
      const cards = await d.select<any[]>(
        'SELECT * FROM cards WHERE column_id = ? ORDER BY position',
        [col.id]
      );
      columnsWithCards.push({
        ...col,
        cards: cards.map((c: any) => ({
            ...c,
            labels: JSON.parse(c.labels || '[]'),
            checklists: JSON.parse(c.checklists || '[]'),
            links: JSON.parse(c.links || '[]'),
          })),
      });
    }
    result.push({ ...board, columns: columnsWithCards });
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
  const count = await d.select<any[]>('SELECT COUNT(*) as c FROM cards WHERE column_id = ?', [columnId]);
  const position = count[0]?.c || 0;
  await d.execute(
    'INSERT INTO cards (id, column_id, title, description, priority, labels, source_channel, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, columnId, title, description, priority, JSON.stringify(labels), sourceChannel, position, Date.now()]
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

// ── Messages ────────────────────────────────────────
export async function getMessages(channelType?: string, limit = 50) {
  const d = await getDb();
  if (channelType) {
    return d.select<any[]>(
      'SELECT * FROM messages WHERE channel_type = ? ORDER BY timestamp DESC LIMIT ?',
      [channelType, limit]
    );
  }
  return d.select<any[]>('SELECT * FROM messages ORDER BY timestamp DESC LIMIT ?', [limit]);
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
  const rows = await d.select<any[]>('SELECT * FROM channels WHERE type = ? LIMIT 1', [type]);
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
  const existing = await d.select<any[]>('SELECT COUNT(*) as c FROM boards');
  if (existing[0]?.c > 0) return;

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
    const rows = await d.select<any[]>('SELECT value FROM settings WHERE key = ?', [key]);
    return rows[0]?.value || null;
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
    const rows = await d.select<any[]>('SELECT key, value FROM settings');
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  } catch {
    return {};
  }
}
