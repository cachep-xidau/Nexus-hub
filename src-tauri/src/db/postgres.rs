use tokio_postgres::Config as PgConfig;
use std::sync::Arc;
use tokio::runtime::Runtime;
use super::connection::DatabaseConnection;
use super::types::*;

pub struct PostgresConnection {
    id: String,
    name: String,
    client: Arc<tokio_postgres::Client>,
    rt: Runtime,
}

impl PostgresConnection {
    pub fn new(
        host: &str,
        port: u16,
        database: &str,
        username: &str,
        password: &str,
        _use_ssl: bool,
    ) -> Result<Box<dyn DatabaseConnection + Send>, String> {
        let rt = Runtime::new().map_err(|e| format!("Runtime error: {}", e))?;

        let conn_str = format!(
            "host={} port={} user={} password={} dbname={}",
            host, port, username, password, database
        );

        let pg_config: PgConfig = conn_str
            .parse()
            .map_err(|e| format!("Config error: {}", e))?;

        let result = rt.block_on(async { pg_config.connect(tokio_postgres::NoTls).await });

        let (client, connection) = result.map_err(|e| format!("Connection error: {}", e))?;

        // Spawn connection handler
        rt.spawn(async move {
            if let Err(e) = connection.await {
                eprintln!("PostgreSQL connection error: {}", e);
            }
        });

        Ok(Box::new(PostgresConnection {
            id: uuid::Uuid::new_v4().to_string(),
            name: format!("{}/{}", host, database),
            client: Arc::new(client),
            rt,
        }))
    }
}

impl DatabaseConnection for PostgresConnection {
    fn info(&self) -> ConnectionInfo {
        ConnectionInfo {
            id: self.id.clone(),
            name: self.name.clone(),
            db_type: DatabaseType::Postgres,
            version: "PostgreSQL".to_string(),
            connected: true,
        }
    }

    fn query(&self, sql: &str) -> Result<QueryResult, String> {
        self.rt.block_on(async {
            let start = std::time::Instant::now();
            let rows = self.client
                .query(sql, &[])
                .await
                .map_err(|e| format!("Query error: {}", e))?;

            if rows.is_empty() {
                return Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    row_count: 0,
                    execution_time_ms: start.elapsed().as_millis() as u64,
                });
            }

            let columns: Vec<String> = rows[0].columns()
                .iter().map(|c| c.name().to_string()).collect();

            let result_rows: Vec<Vec<Option<String>>> = rows
                .iter()
                .map(|row| {
                    columns.iter()
                        .enumerate()
                        .map(|(i, _)| {
                            row.try_get::<_, Option<String>>(i).ok().flatten()
                        })
                        .collect()
                })
                .collect();

            Ok(QueryResult {
                columns,
                rows: result_rows.clone(),
                row_count: result_rows.len(),
                execution_time_ms: start.elapsed().as_millis() as u64,
            })
        })
    }

    fn execute(&self, sql: &str) -> Result<ExecuteResult, String> {
        self.rt.block_on(async {
            let start = std::time::Instant::now();
            let result = self.client
                .execute(sql, &[])
                .await
                .map_err(|e| format!("Execute error: {}", e))?;

            Ok(ExecuteResult {
                rows_affected: result,
                last_insert_id: None,
                execution_time_ms: start.elapsed().as_millis() as u64,
            })
        })
    }

    fn get_tables(&self) -> Result<Vec<TableInfo>, String> {
        self.query(
            "SELECT table_name FROM information_schema.tables \
             WHERE table_schema = 'public' AND table_type = 'BASE TABLE' \
             ORDER BY table_name"
        ).map(|r| {
            r.rows.iter()
                .filter_map(|row| {
                    let name = row.get(0)?.clone().unwrap_or_default();
                    Some(TableInfo {
                        name,
                        schema: Some("public".to_string()),
                        row_count: None,
                    })
                })
                .collect()
        })
    }

    fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String> {
        let sql = format!(
            "SELECT column_name, data_type, is_nullable, column_default \
             FROM information_schema.columns \
             WHERE table_schema = 'public' AND table_name = '{}' \
             ORDER BY ordinal_position",
            table
        );
        self.query(&sql).map(|r| {
            r.rows.iter()
                .filter_map(|row| {
                    Some(ColumnInfo {
                        name: row.get(0)?.clone().unwrap_or_default(),
                        data_type: row.get(1)?.clone().unwrap_or_default(),
                        nullable: row.get(2)?.clone().unwrap_or_default() == "YES",
                        default: row.get(3).and_then(|s| s.clone()),
                        primary_key: false,
                    })
                })
                .collect()
        })
    }

    fn close(&self) {
        // Connection closes on drop
    }
}
