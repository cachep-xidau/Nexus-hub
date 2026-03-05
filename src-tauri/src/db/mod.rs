mod connection;
mod sqlite;
mod postgres;
mod mysql;
mod types;

use std::sync::Mutex;
use tauri::State;
use connection::{ConnectionPool, create_connection};
pub use types::*;

pub fn get_connection_pool() -> ConnectionPool {
    Mutex::new(std::collections::HashMap::new())
}

// ── SQL Validation ──────────────────────────────────────────────────────────
// Prevents dangerous SQL operations from the frontend TablePlus UI.

fn validate_query_sql(sql: &str) -> Result<(), String> {
    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return Err("Empty SQL statement".into());
    }

    let upper = trimmed.to_uppercase();

    // Query must be read-only
    if !upper.starts_with("SELECT")
        && !upper.starts_with("SHOW")
        && !upper.starts_with("DESCRIBE")
        && !upper.starts_with("EXPLAIN")
        && !upper.starts_with("WITH")
    {
        return Err("db_query only allows SELECT/SHOW/DESCRIBE/EXPLAIN/WITH statements".into());
    }

    validate_common(sql)
}

fn validate_execute_sql(sql: &str) -> Result<(), String> {
    let trimmed = sql.trim();
    if trimmed.is_empty() {
        return Err("Empty SQL statement".into());
    }

    validate_common(sql)
}

fn validate_common(sql: &str) -> Result<(), String> {
    let upper = sql.to_uppercase();

    // Block dangerous keywords
    let blocked = ["ATTACH", "DETACH", "LOAD_EXTENSION"];
    for keyword in blocked {
        // Check for keyword as a standalone word (surrounded by whitespace or start/end)
        if upper.split_whitespace().any(|w| w == keyword) {
            return Err(format!("SQL keyword '{}' is not allowed", keyword));
        }
    }

    // Block multi-statement execution (simple heuristic: >1 semicolon in non-trailing position)
    let without_trailing = sql.trim().trim_end_matches(';');
    if without_trailing.contains(';') {
        return Err("Multiple SQL statements in a single call are not allowed".into());
    }

    Ok(())
}

#[tauri::command]
pub fn db_connect(
    config: ConnectionConfig,
    pool: State<ConnectionPool>,
) -> Result<ConnectionInfo, String> {
    let conn = create_connection(&config)?;
    let mut info = conn.info();
    info.id = config.id.clone();

    let mut pool = pool.lock().map_err(|_| "Lock error")?;
    pool.insert(info.id.clone(), conn);

    Ok(info)
}

#[tauri::command]
pub fn db_disconnect(
    conn_id: String,
    pool: State<ConnectionPool>,
) -> Result<(), String> {
    let mut pool = pool.lock().map_err(|_| "Lock error")?;
    if let Some(conn) = pool.remove(&conn_id) {
        conn.close();
    }
    Ok(())
}

#[tauri::command]
pub fn db_query(
    conn_id: String,
    sql: String,
    pool: State<ConnectionPool>,
) -> Result<QueryResult, String> {
    validate_query_sql(&sql)?;
    let pool = pool.lock().map_err(|_| "Lock error")?;
    let conn = pool.get(&conn_id)
        .ok_or("Connection not found")?;
    conn.query(&sql)
}

#[tauri::command]
pub fn db_execute(
    conn_id: String,
    sql: String,
    pool: State<ConnectionPool>,
) -> Result<ExecuteResult, String> {
    validate_execute_sql(&sql)?;
    let pool = pool.lock().map_err(|_| "Lock error")?;
    let conn = pool.get(&conn_id)
        .ok_or("Connection not found")?;
    conn.execute(&sql)
}

#[tauri::command]
pub fn db_get_tables(
    conn_id: String,
    pool: State<ConnectionPool>,
) -> Result<Vec<TableInfo>, String> {
    let pool = pool.lock().map_err(|_| "Lock error")?;
    let conn = pool.get(&conn_id)
        .ok_or("Connection not found")?;
    conn.get_tables()
}

#[tauri::command]
pub fn db_get_columns(
    conn_id: String,
    table: String,
    pool: State<ConnectionPool>,
) -> Result<Vec<ColumnInfo>, String> {
    // Validate table name: only allow alphanumeric, underscore, dot (for schema.table)
    if !table.chars().all(|c| c.is_alphanumeric() || c == '_' || c == '.') {
        return Err("Invalid table name: only alphanumeric, underscore, and dot allowed".into());
    }
    let pool = pool.lock().map_err(|_| "Lock error")?;
    let conn = pool.get(&conn_id)
        .ok_or("Connection not found")?;
    conn.get_columns(&table)
}
