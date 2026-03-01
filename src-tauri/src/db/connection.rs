use std::collections::HashMap;
use std::sync::Mutex;
use super::types::{ConnectionConfig, ConnectionInfo, DatabaseType, QueryResult, ExecuteResult, TableInfo, ColumnInfo};

pub type ConnectionPool = Mutex<HashMap<String, Box<dyn DatabaseConnection + Send>>>;

pub trait DatabaseConnection {
    fn info(&self) -> ConnectionInfo;
    fn query(&self, sql: &str) -> Result<QueryResult, String>;
    fn execute(&self, sql: &str) -> Result<ExecuteResult, String>;
    fn get_tables(&self) -> Result<Vec<TableInfo>, String>;
    fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String>;
    fn close(&self);
}

pub fn create_connection(config: &ConnectionConfig) -> Result<Box<dyn DatabaseConnection + Send>, String> {
    match config.db_type {
        DatabaseType::Sqlite => {
            let path = config.file_path.as_ref()
                .ok_or("SQLite requires file_path")?;
            super::sqlite::SqliteConnection::new(path)
        },
        DatabaseType::Postgres => {
            let host = config.host.as_ref().ok_or("PostgreSQL requires host")?;
            let port = config.port.unwrap_or(5432);
            let db = config.database.as_ref().ok_or("PostgreSQL requires database")?;
            let user = config.username.as_ref().ok_or("PostgreSQL requires username")?;
            let pass = config.password.as_deref().unwrap_or("");
            super::postgres::PostgresConnection::new(host, port, db, user, pass, true)
        },
        DatabaseType::Mysql => {
            let host = config.host.as_ref().ok_or("MySQL requires host")?;
            let port = config.port.unwrap_or(3306);
            let db = config.database.as_ref().ok_or("MySQL requires database")?;
            let user = config.username.as_ref().ok_or("MySQL requires username")?;
            let pass = config.password.as_deref().unwrap_or("");
            super::mysql::MysqlConnection::new(host, port, db, user, pass)
        },
    }
}
