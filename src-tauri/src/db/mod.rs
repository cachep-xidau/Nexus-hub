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

#[tauri::command]
pub fn db_connect(
    config: ConnectionConfig,
    pool: State<ConnectionPool>,
) -> Result<ConnectionInfo, String> {
    let conn = create_connection(&config)?;
    let info = conn.info();

    let mut pool = pool.lock().map_err(|_| "Lock error")?;
    pool.insert(config.id.clone(), conn);

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
    let pool = pool.lock().map_err(|_| "Lock error")?;
    let conn = pool.get(&conn_id)
        .ok_or("Connection not found")?;
    conn.get_columns(&table)
}
