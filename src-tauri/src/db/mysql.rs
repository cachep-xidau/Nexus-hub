use mysql::{Pool, PooledConn, OptsBuilder, prelude::Queryable};
use super::connection::DatabaseConnection;
use super::types::*;

pub struct MysqlConnection {
    id: String,
    name: String,
    pool: Pool,
}

impl MysqlConnection {
    pub fn new(
        host: &str,
        port: u16,
        database: &str,
        username: &str,
        password: &str,
    ) -> Result<Box<dyn DatabaseConnection + Send>, String> {
        let opts = OptsBuilder::new()
            .ip_or_hostname(Some(host))
            .tcp_port(port)
            .db_name(Some(database))
            .user(Some(username))
            .pass(Some(password));

        let pool = Pool::new(opts)
            .map_err(|e| format!("MySQL connection error: {}", e))?;

        Ok(Box::new(MysqlConnection {
            id: uuid::Uuid::new_v4().to_string(),
            name: format!("{}/{}", host, database),
            pool,
        }))
    }

    fn get_conn(&self) -> Result<PooledConn, String> {
        self.pool.get_conn()
            .map_err(|e| format!("Connection pool error: {}", e))
    }
}

impl DatabaseConnection for MysqlConnection {
    fn info(&self) -> ConnectionInfo {
        ConnectionInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            db_type: DatabaseType::Mysql,
            version: "MySQL".to_string(),
            connected: true,
        }
    }

    fn query(&self, sql: &str) -> Result<QueryResult, String> {
        let start = std::time::Instant::now();
        let mut conn = self.get_conn()?;

        let result: Vec<mysql::Row> = conn.query(sql)
            .map_err(|e| format!("Query error: {}", e))?;

        if result.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                row_count: 0,
                execution_time_ms: start.elapsed().as_millis() as u64,
            });
        }

        let columns: Vec<String> = result[0].columns()
            .iter()
            .map(|c| c.name_str().to_string())
            .collect();

        let rows: Vec<Vec<Option<String>>> = result
            .iter()
            .map(|row| {
                columns.iter()
                    .enumerate()
                    .map(|(i, _)| row.get::<String, _>(i))
                    .collect()
            })
            .collect();

        Ok(QueryResult {
            columns,
            rows: rows.clone(),
            row_count: rows.len(),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }

    fn execute(&self, sql: &str) -> Result<ExecuteResult, String> {
        let start = std::time::Instant::now();
        let mut conn = self.get_conn()?;

        conn.query_drop(sql)
            .map_err(|e| format!("Execute error: {}", e))?;

        Ok(ExecuteResult {
            rows_affected: conn.affected_rows(),
            last_insert_id: Some(conn.last_insert_id() as i64),
            execution_time_ms: start.elapsed().as_millis() as u64,
        })
    }

    fn get_tables(&self) -> Result<Vec<TableInfo>, String> {
        let result = self.query("SHOW TABLES")?;
        Ok(result.rows.iter()
            .filter_map(|row| {
                let name = row.get(0)?.clone().unwrap_or_default();
                Some(TableInfo {
                    name,
                    schema: None,
                    row_count: None,
                })
            })
            .collect())
    }

    fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String> {
        let sql = format!("DESCRIBE `{}`", table);
        let result = self.query(&sql)?;

        Ok(result.rows.iter()
            .filter_map(|row| {
                if row.len() < 4 {
                    return None;
                }
                let name = row.get(0)?.clone().unwrap_or_default();
                let data_type = row.get(1)?.clone().unwrap_or_default();
                let nullable_str = row.get(2)?.clone().unwrap_or_default().to_lowercase();
                let nullable = nullable_str == "yes";
                let default = row.get(4).and_then(|s| s.clone());
                let key_str = row.get(3)?.clone().unwrap_or_default().to_uppercase();
                let primary_key = key_str == "PRI";

                Some(ColumnInfo {
                    name,
                    data_type,
                    nullable,
                    default,
                    primary_key,
                })
            })
            .collect())
    }

    fn close(&self) {
        // Pool closes on drop
    }
}
