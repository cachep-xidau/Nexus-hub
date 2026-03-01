import { invoke } from '@tauri-apps/api/core';
import Database from '@tauri-apps/plugin-sql';

// Types matching Rust types
export type DatabaseType = 'Sqlite' | 'Postgres' | 'Mysql';

export interface ConnectionConfig {
  id: string;
  name: string;
  db_type: DatabaseType;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  file_path?: string;
}

export interface ConnectionInfo {
  id: string;
  name: string;
  db_type: DatabaseType;
  version: string;
  connected: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: (string | null)[][];
  row_count: number;
  execution_time_ms: number;
}

export interface ExecuteResult {
  rows_affected: number;
  last_insert_id: number | null;
  execution_time_ms: number;
}

export interface TableInfo {
  name: string;
  schema?: string;
  row_count?: number;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  nullable: boolean;
  default?: string;
  primary_key: boolean;
}

// Tauri command wrappers
export async function dbConnect(config: ConnectionConfig): Promise<ConnectionInfo> {
  return invoke('db_connect', { config });
}

export async function dbDisconnect(connId: string): Promise<void> {
  return invoke('db_disconnect', { connId });
}

export async function dbQuery(connId: string, sql: string): Promise<QueryResult> {
  return invoke('db_query', { connId, sql });
}

export async function dbExecute(connId: string, sql: string): Promise<ExecuteResult> {
  return invoke('db_execute', { connId, sql });
}

export async function dbGetTables(connId: string): Promise<TableInfo[]> {
  return invoke('db_get_tables', { connId });
}

export async function dbGetColumns(connId: string, table: string): Promise<ColumnInfo[]> {
  return invoke('db_get_columns', { connId, table });
}

// Saved connections storage
let _tpTablesReady = false;

async function ensureTables() {
  if (_tpTablesReady) return;
  const db = await Database.load('sqlite:nexus.db');
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tp_connections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      db_type TEXT NOT NULL,
      host TEXT,
      port INTEGER,
      database TEXT,
      username TEXT,
      password_enc TEXT,
      file_path TEXT,
      color TEXT DEFAULT '#3b82f6',
      created_at INTEGER,
      last_connected_at INTEGER
    )
  `);
  _tpTablesReady = true;
}

export async function getSavedConnections(): Promise<ConnectionConfig[]> {
  await ensureTables();
  const db = await Database.load('sqlite:nexus.db');
  const rows = await db.select<any[]>('SELECT * FROM tp_connections ORDER BY name');
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    db_type: r.db_type as DatabaseType,
    host: r.host || undefined,
    port: r.port || undefined,
    database: r.database || undefined,
    username: r.username || undefined,
    password: r.password_enc || undefined,
    file_path: r.file_path || undefined,
  }));
}

export async function saveConnection(conn: ConnectionConfig): Promise<void> {
  await ensureTables();
  const db = await Database.load('sqlite:nexus.db');
  await db.execute(
    `INSERT OR REPLACE INTO tp_connections
     (id, name, db_type, host, port, database, username, password_enc, file_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [conn.id, conn.name, conn.db_type, conn.host || null, conn.port || null,
     conn.database || null, conn.username || null, conn.password || null,
     conn.file_path || null, Date.now()]
  );
}

export async function deleteConnection(id: string): Promise<void> {
  const db = await Database.load('sqlite:nexus.db');
  await db.execute('DELETE FROM tp_connections WHERE id = ?', [id]);
}
