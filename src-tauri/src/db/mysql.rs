use mysql::{Pool, PooledConn, OptsBuilder, SslOpts, Value, prelude::Queryable};
use super::connection::DatabaseConnection;
use super::types::*;

pub struct MysqlConnection {
    id: String,
    name: String,
    pool: Pool,
}

impl MysqlConnection {
    fn value_to_string(value: &Value) -> Option<String> {
        match value {
            Value::NULL => None,
            Value::Bytes(bytes) => Some(String::from_utf8_lossy(bytes).to_string()),
            Value::Int(n) => Some(n.to_string()),
            Value::UInt(n) => Some(n.to_string()),
            Value::Float(n) => Some(n.to_string()),
            Value::Double(n) => Some(n.to_string()),
            Value::Date(year, month, day, hour, minute, second, micro) => {
                if *micro > 0 {
                    Some(format!(
                        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}.{:06}",
                        year, month, day, hour, minute, second, micro
                    ))
                } else {
                    Some(format!(
                        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
                        year, month, day, hour, minute, second
                    ))
                }
            }
            Value::Time(neg, days, hours, minutes, seconds, micro) => {
                let sign = if *neg { "-" } else { "" };
                if *micro > 0 {
                    Some(format!(
                        "{}{} {:02}:{:02}:{:02}.{:06}",
                        sign, days, hours, minutes, seconds, micro
                    ))
                } else {
                    Some(format!(
                        "{}{} {:02}:{:02}:{:02}",
                        sign, days, hours, minutes, seconds
                    ))
                }
            }
        }
    }

    fn build_pool(
        host: &str,
        port: u16,
        database: &str,
        username: &str,
        password: &str,
        use_tls: bool,
    ) -> Result<Pool, String> {
        let mut opts = OptsBuilder::new()
            .ip_or_hostname(Some(host))
            .tcp_port(port)
            .db_name(Some(database))
            .user(Some(username))
            .pass(Some(password));

        if use_tls {
            opts = opts.ssl_opts(Some(SslOpts::default()));
        }

        let pool = Pool::new(opts)
            .map_err(|e| format!("MySQL connection error: {}", e))?;

        // Force a real handshake early so UI fails fast with actionable error.
        pool.get_conn()
            .map_err(|e| format!("MySQL authentication/handshake failed: {}", e))?;

        Ok(pool)
    }

    pub fn new(
        host: &str,
        port: u16,
        database: &str,
        username: &str,
        password: &str,
    ) -> Result<Box<dyn DatabaseConnection + Send>, String> {
        let pool = match Self::build_pool(host, port, database, username, password, false) {
            Ok(pool) => pool,
            Err(primary_err) => {
                // Retry with TLS for managed MySQL that enforces secure transport.
                if let Ok(pool) = Self::build_pool(host, port, database, username, password, true) {
                    pool
                } else if host.eq_ignore_ascii_case("localhost") {
                    // Common local setup: MySQL listens on 127.0.0.1 but "localhost" may resolve unexpectedly.
                    Self::build_pool("127.0.0.1", port, database, username, password, false)
                        .or_else(|_| Self::build_pool("127.0.0.1", port, database, username, password, true))
                        .map_err(|fallback_err| {
                            format!(
                                "{}. Retries with TLS/127.0.0.1 also failed: {}",
                                primary_err, fallback_err
                            )
                        })?
                } else {
                    return Err(primary_err);
                }
            }
        };

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
                    .map(|(i, _)| {
                        match row.as_ref(i) {
                            Some(value) => Self::value_to_string(value),
                            None => None,
                        }
                    })
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
        // Load all tables in all schemas/databases visible to this credential.
        let result = self.query(
            "SELECT table_schema, table_name \
             FROM information_schema.tables \
             WHERE table_type = 'BASE TABLE' \
             ORDER BY table_schema, table_name"
        )?;

        Ok(result.rows.iter()
            .filter_map(|row| {
                let schema = row.get(0)?.clone().unwrap_or_default();
                let table_name = row.get(1)?.clone().unwrap_or_default();
                Some(TableInfo {
                    name: format!("{}.{}", schema, table_name),
                    schema: Some(schema),
                    row_count: None,
                })
            })
            .collect())
    }

    fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String> {
        let (schema_name, table_name) = match table.split_once('.') {
            Some((schema, name)) => (schema.to_string(), name.to_string()),
            None => ("".to_string(), table.to_string()),
        };
        let safe_schema = schema_name.replace('\'', "''");
        let safe_table = table_name.replace('\'', "''");

        let sql = if safe_schema.is_empty() {
            format!(
                "SELECT column_name, column_type, is_nullable, column_default, column_key \
                 FROM information_schema.columns \
                 WHERE table_name = '{}' \
                 ORDER BY ordinal_position",
                safe_table
            )
        } else {
            format!(
                "SELECT column_name, column_type, is_nullable, column_default, column_key \
                 FROM information_schema.columns \
                 WHERE table_schema = '{}' AND table_name = '{}' \
                 ORDER BY ordinal_position",
                safe_schema, safe_table
            )
        };

        let result = self.query(&sql)?;

        Ok(result.rows.iter()
            .filter_map(|row| {
                if row.len() < 5 {
                    return None;
                }
                let name = row.get(0)?.clone().unwrap_or_default();
                let data_type = row.get(1)?.clone().unwrap_or_default();
                let nullable_str = row.get(2)?.clone().unwrap_or_default().to_lowercase();
                let nullable = nullable_str == "yes";
                let default = row.get(3).and_then(|s| s.clone());
                let key_str = row.get(4)?.clone().unwrap_or_default().to_uppercase();
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
