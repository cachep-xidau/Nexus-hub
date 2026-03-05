# Phase 01: Rust Backend Security

> Parent plan: [plan.md](./plan.md)  
> Dependencies: None  
> Parallelization: Group A — runs concurrently with Phases 02, 03, 04

## Overview

| Field | Value |
|-------|-------|
| Date | 2026-03-05 |
| Priority | P0 (Critical) |
| Status | pending |
| Effort | 1.5h |

## Edge Cases Fixed

| # | Edge Case | Severity |
|---|-----------|----------|
| 1 | SQL injection in `db_query`/`db_execute` — raw SQL from frontend | Critical |
| 2 | SQL injection in `get_columns` — unescaped `format!()` in SQLite | Critical |
| 25 | Rust `Mutex<HashMap>` serializes all DB queries | Medium |
| 26 | Stale connections — no validation or reconnect | Medium |

## File Ownership (Exclusive)

- `src-tauri/src/db/mod.rs`
- `src-tauri/src/db/connection.rs`
- `src-tauri/src/db/sqlite.rs`
- `src-tauri/src/db/postgres.rs`
- `src-tauri/src/db/mysql.rs`
- `src-tauri/src/db/types.rs` (read-only, add new types if needed)

## Implementation Steps

### Step 1: Sanitize `db_query` and `db_execute` inputs

**File**: `src-tauri/src/db/mod.rs`

Add SQL statement validation to `db_query` and `db_execute`:

```rust
fn validate_sql(sql: &str) -> Result<(), String> {
    let trimmed = sql.trim().to_uppercase();
    // db_query: only allow SELECT
    // db_execute: allow INSERT, UPDATE, DELETE, CREATE, ALTER, DROP
    // Block: multiple statements (;), ATTACH, DETACH, LOAD_EXTENSION
    if sql.contains(';') && sql.trim_end_matches(';').contains(';') {
        return Err("Multiple SQL statements not allowed".into());
    }
    let blocked = ["ATTACH", "DETACH", "LOAD_EXTENSION", "PRAGMA"];
    for keyword in blocked {
        if trimmed.contains(keyword) {
            return Err(format!("SQL keyword '{}' is not allowed", keyword));
        }
    }
    Ok(())
}
```

Add validation call before `conn.query(&sql)` and `conn.execute(&sql)`.

For `db_query`: additionally restrict to `SELECT` statements only:
```rust
if !trimmed.starts_with("SELECT") && !trimmed.starts_with("SHOW") && !trimmed.starts_with("DESCRIBE") && !trimmed.starts_with("EXPLAIN") {
    return Err("db_query only allows SELECT statements".into());
}
```

### Step 2: Fix `get_columns` SQL injection

**Files**: `sqlite.rs`, `postgres.rs`, `mysql.rs`

**SQLite** (`sqlite.rs:95`): Replace string interpolation with identifier quoting:
```rust
fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String> {
    // Validate table name: alphanumeric + underscore only
    if !table.chars().all(|c| c.is_alphanumeric() || c == '_') {
        return Err("Invalid table name".into());
    }
    let sql = format!("PRAGMA table_info(\"{}\")", table.replace('"', "\"\""));
    // ...
}
```

**Postgres** (`postgres.rs:149-158`): Use parameterized query instead of `format!()`:
```rust
fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String> {
    let (schema_name, table_name) = match table.split_once('.') {
        Some((s, t)) => (s.to_string(), t.to_string()),
        None => ("public".to_string(), table.to_string()),
    };
    // Use parameterized query
    self.rt.block_on(async {
        let rows = self.client.query(
            "SELECT column_name, data_type, is_nullable, column_default \
             FROM information_schema.columns \
             WHERE table_schema = $1 AND table_name = $2 \
             ORDER BY ordinal_position",
            &[&schema_name, &table_name]
        ).await.map_err(|e| format!("Error: {}", e))?;
        // ... parse rows
    })
}
```

**MySQL** (`mysql.rs:220-236`): Use parameterized queries:
```rust
fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String> {
    let (schema_name, table_name) = match table.split_once('.') {
        Some((s, t)) => (s.to_string(), t.to_string()),
        None => ("".to_string(), table.to_string()),
    };
    let mut conn = self.get_conn()?;
    let sql = if schema_name.is_empty() {
        "SELECT column_name, column_type, is_nullable, column_default, column_key \
         FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position"
    } else {
        "SELECT column_name, column_type, is_nullable, column_default, column_key \
         FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position"
    };
    // Use conn.exec() with params instead of self.query(&sql)
}
```

### Step 3: Replace `Mutex<HashMap>` with `RwLock`

**File**: `src-tauri/src/db/connection.rs`, `mod.rs`

```rust
// connection.rs
pub type ConnectionPool = std::sync::RwLock<HashMap<String, Box<dyn DatabaseConnection + Send>>>;

// mod.rs
pub fn get_connection_pool() -> ConnectionPool {
    std::sync::RwLock::new(std::collections::HashMap::new())
}
```

Update `db_query` and `db_get_tables`/`db_get_columns` to use `pool.read()` (read lock).
Update `db_connect`/`db_disconnect` to use `pool.write()` (write lock).

### Step 4: Add connection validation

**File**: `src-tauri/src/db/connection.rs`

Add a `is_alive` method to `DatabaseConnection` trait:
```rust
pub trait DatabaseConnection {
    fn info(&self) -> ConnectionInfo;
    fn query(&self, sql: &str) -> Result<QueryResult, String>;
    fn execute(&self, sql: &str) -> Result<ExecuteResult, String>;
    fn get_tables(&self) -> Result<Vec<TableInfo>, String>;
    fn get_columns(&self, table: &str) -> Result<Vec<ColumnInfo>, String>;
    fn is_alive(&self) -> bool;
    fn close(&self);
}
```

Implement for each driver:
- **SQLite**: `self.conn.execute("SELECT 1", []).is_ok()`
- **Postgres**: `self.rt.block_on(async { self.client.simple_query("SELECT 1").await.is_ok() })`
- **MySQL**: `self.pool.get_conn().is_ok()`

In `db_query`/`db_execute`, check `conn.is_alive()` before executing, return error if dead.

## Conflict Prevention

- Only modifies `src-tauri/src/db/` files — no overlap with any other phase.
- No frontend TypeScript changes.

## Success Criteria

- [ ] `cargo build` succeeds with no warnings
- [ ] `db_query` rejects non-SELECT statements
- [ ] `db_execute` rejects multi-statement SQL and ATTACH/PRAGMA
- [ ] `get_columns` uses identifier quoting (SQLite) or params (PG/MySQL)
- [ ] Read-heavy operations use `RwLock::read()`
- [ ] Connection validation added to trait and all 3 drivers

## Risk Assessment

- **Low risk**: SQL validation may reject legitimate edge-case queries (e.g., CTEs, UNION). Mitigation: only block truly dangerous keywords, allow read-only queries in `db_query`.
- **Medium risk**: `RwLock` change is a behavioral change but strictly better than `Mutex` for read-heavy workloads.
