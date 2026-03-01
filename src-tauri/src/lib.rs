use tauri_plugin_sql::{Migration, MigrationKind};

mod db;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS boards (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS columns (
                    id TEXT PRIMARY KEY,
                    board_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    position INTEGER NOT NULL DEFAULT 0,
                    color TEXT DEFAULT '#6366f1',
                    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS cards (
                    id TEXT PRIMARY KEY,
                    column_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    priority TEXT DEFAULT 'medium',
                    labels TEXT DEFAULT '[]',
                    source_channel TEXT DEFAULT 'manual',
                    source_message_id TEXT,
                    assignee TEXT,
                    due_date TEXT,
                    position INTEGER NOT NULL DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
                );
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    channel_type TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    sender_name TEXT NOT NULL,
                    sender_email TEXT,
                    sender_avatar TEXT,
                    subject TEXT,
                    body TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    is_read INTEGER DEFAULT 0,
                    metadata TEXT DEFAULT '{}'
                );
                CREATE TABLE IF NOT EXISTS channels (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    name TEXT NOT NULL,
                    config TEXT DEFAULT '{}',
                    is_active INTEGER DEFAULT 0,
                    last_sync_at INTEGER
                );
                CREATE TABLE IF NOT EXISTS agent_conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT DEFAULT 'New Conversation',
                    messages TEXT DEFAULT '[]',
                    created_at INTEGER NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_settings_table",
            sql: "
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_repo_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS repo_projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    prd_content TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS repo_features (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    sort_order INTEGER DEFAULT 0,
                    project_id TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES repo_projects(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_features_project ON repo_features(project_id);

                CREATE TABLE IF NOT EXISTS repo_functions (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    sort_order INTEGER DEFAULT 0,
                    feature_id TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (feature_id) REFERENCES repo_features(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_functions_feature ON repo_functions(feature_id);

                CREATE TABLE IF NOT EXISTS repo_artifacts (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    title TEXT DEFAULT '',
                    content TEXT NOT NULL,
                    version INTEGER DEFAULT 1,
                    status TEXT DEFAULT 'current',
                    source_hash TEXT,
                    function_id TEXT,
                    project_id TEXT,
                    epic_id TEXT,
                    story_id TEXT,
                    created_at INTEGER NOT NULL,
                    FOREIGN KEY (function_id) REFERENCES repo_functions(id) ON DELETE CASCADE,
                    FOREIGN KEY (project_id) REFERENCES repo_projects(id) ON DELETE CASCADE,
                    FOREIGN KEY (epic_id) REFERENCES repo_artifacts(id) ON DELETE CASCADE,
                    FOREIGN KEY (story_id) REFERENCES repo_artifacts(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_artifacts_function ON repo_artifacts(function_id);
                CREATE INDEX IF NOT EXISTS idx_artifacts_project ON repo_artifacts(project_id);
                CREATE INDEX IF NOT EXISTS idx_artifacts_type ON repo_artifacts(type);
                CREATE INDEX IF NOT EXISTS idx_artifacts_status ON repo_artifacts(status);

                CREATE TABLE IF NOT EXISTS repo_analysis_docs (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT DEFAULT '',
                    status TEXT DEFAULT 'draft',
                    metadata TEXT,
                    project_id TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES repo_projects(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_analysis_project ON repo_analysis_docs(project_id);

                CREATE TABLE IF NOT EXISTS repo_mcp_connections (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    config TEXT NOT NULL,
                    status TEXT DEFAULT 'disconnected',
                    tool_count INTEGER DEFAULT 0,
                    project_id TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (project_id) REFERENCES repo_projects(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_mcp_project ON repo_mcp_connections(project_id);

                CREATE TABLE IF NOT EXISTS repo_skills (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    type TEXT NOT NULL,
                    category TEXT NOT NULL,
                    icon TEXT DEFAULT 'Zap',
                    trigger_type TEXT NOT NULL,
                    trigger_config TEXT DEFAULT '{}',
                    enabled INTEGER DEFAULT 1,
                    built_in INTEGER DEFAULT 1,
                    sort_order INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_skills_type ON repo_skills(type);
                CREATE INDEX IF NOT EXISTS idx_skills_category ON repo_skills(category);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_trello_sync_columns",
            sql: "
                ALTER TABLE boards ADD COLUMN trello_id TEXT;
                ALTER TABLE columns ADD COLUMN trello_id TEXT;
                ALTER TABLE cards ADD COLUMN trello_id TEXT;
                ALTER TABLE cards ADD COLUMN checklists TEXT DEFAULT '[]';
                ALTER TABLE cards ADD COLUMN links TEXT DEFAULT '[]';
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_knowledge_hub_tables",
            sql: "
                CREATE TABLE IF NOT EXISTS knowledge_domains (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    slug TEXT NOT NULL UNIQUE,
                    description TEXT DEFAULT '',
                    icon TEXT DEFAULT 'BookOpen',
                    sort_order INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS knowledge_articles (
                    id TEXT PRIMARY KEY,
                    domain_id TEXT NOT NULL,
                    section TEXT NOT NULL,
                    title TEXT NOT NULL,
                    slug TEXT NOT NULL,
                    content TEXT NOT NULL,
                    sort_order INTEGER DEFAULT 0,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    FOREIGN KEY (domain_id) REFERENCES knowledge_domains(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_knowledge_articles_domain ON knowledge_articles(domain_id);
                CREATE INDEX IF NOT EXISTS idx_knowledge_articles_slug ON knowledge_articles(slug);
            ",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:nexus.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .manage(db::get_connection_pool())
        .invoke_handler(tauri::generate_handler![
            db::db_connect,
            db::db_disconnect,
            db::db_query,
            db::db_execute,
            db::db_get_tables,
            db::db_get_columns,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
