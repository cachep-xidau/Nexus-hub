use rusqlite::{Connection, OpenFlags};
use super::connection::DatabaseConnection;
use super::types::*;

pub struct SqliteConnection {
    id: String,
    name: String,
    conn: Connection,
}

impl SqliteConnection {
    pub fn new(path: &str) -> Result<Box<dyn DatabaseConnection + Send>, String> {
        let conn = Connection::open_with_flags(
            path,
            OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE
        ).map_err(|e| format!("SQLite connection error: {}", e))?;

        Ok(Box::new(SqliteConnection {
            id: uuid::Uuid::new_v4().to_string(),
            name: path.to_string(),
            conn,
        }))
    }
}

impl DatabaseConnection for SqliteConnection {
    fn info(&self) -> ConnectionInfo {
        ConnectionInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            db_type: DatabaseType::Sqlite,
            version: "3".to_string(),
            connected: true,
        }
    }

    fn query(&self, sql: &str) -> Result<QueryResult, String> {
        let start = std::time::Instant::now();
        let mut stmt = self.conn.prepare(sql)
            .map_err(|e| format!("Prepare error: {}", e))?;

        let column_names: Vec<String> = stmt.column_names()
            .iter().map(|s| s.to_string()).collect();

        let rows = stmt.query_map([], |row| {
            let mut values = Vec::new();
            for i in 0..column_names.len() {
                let val: Option<String> = row.get(i).ok();
                values.push(val);
            }
            Ok(values)
        }).map_err(|e| format!("Query error: {}", e))?;

        let rows: Vec<Vec<Option<String>>> = rows
            .filter_map(|r| r.ok())
            .collect();

        Ok(QueryResult {
            columns: column_names,
            row_count: rows.len(),
            rows,
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }

    fn execute(&self, sql: &str) -> Result<ExecuteResult, String> {
        let start = std::time::Instant::now();
        let result = self.conn.execute(sql, [])
            .map_err(|e| format!("Execute error: {}", e))?;

        Ok(ExecuteResult {
            rows_affected: result as u64,
            last_insert_id: Some(self.conn.last_insert_rowid()),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }

    fn get_tables(&self) -> Result<Vec<TableInfo>, String> {
        let sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
        let mut stmt = self.conn.prepare(sql)
            .map_err(|e| format!("Error: {}", e))?;

        let tables = stmt.query_map([], |row| {
            Ok(TableInfo {
                name: row.get(0)?,
                schema: None,
                row_count: None,
            })
        }).map_err(|e| format!("Error: {}", e))?;

        Ok(tables.filter_map(|t| t.ok()).collect())
    }

    fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String> {
        let sql = format!("PRAGMA table_info({})", table);
        let mut stmt = self.conn.prepare(&sql)
            .map_err(|e| format!("Error: {}", e))?;

        let columns = stmt.query_map([], |row| {
            Ok(ColumnInfo {
                name: row.get(1)?,
                data_type: row.get(2)?,
                nullable: row.get::<_, i32>(3)? == 0,
                default: row.get(4)?,
                primary_key: row.get::<_, i32>(5)? == 1,
            })
        }).map_err(|e| format!("Error: {}", e))?;

        Ok(columns.filter_map(|c| c.ok()).collect())
    }

    fn close(&self) {
        // Connection closes on drop
    }
}
