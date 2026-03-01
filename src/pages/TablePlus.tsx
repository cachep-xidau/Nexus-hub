import { useState, useEffect } from 'react';
import { Plus, Database, Play, RefreshCw, Table, ChevronRight, ChevronDown, Key, Hash, Columns, Code, Edit3, Sparkles } from 'lucide-react';
import { ConnectionForm } from '../components/tableplus/ConnectionForm';
import { ConnectionList } from '../components/tableplus/ConnectionList';
import { DataGrid } from '../components/tableplus/DataGrid';
import { AIAssistant } from '../components/tableplus/AIAssistant';
import {
  getSavedConnections,
  saveConnection,
  deleteConnection,
  dbConnect,
  dbDisconnect,
  dbQuery,
  dbGetTables,
  dbGetColumns,
  type ConnectionConfig,
  type ConnectionInfo,
  type TableInfo,
  type ColumnInfo,
  type QueryResult,
} from '../lib/tableplus-db';

type TabType = 'query' | 'data';

export function TablePlus() {
  const [connections, setConnections] = useState<ConnectionConfig[]>([]);
  const [activeConnection, setActiveConnection] = useState<ConnectionInfo | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConn, setEditingConn] = useState<ConnectionConfig | null>(null);

  // Schema browser state
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<Record<string, ColumnInfo[]>>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('query');

  // Query editor state
  const [sql, setSql] = useState('SELECT * FROM sqlite_master LIMIT 10;');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load saved connections
  useEffect(() => {
    getSavedConnections().then(setConnections).catch(console.error);
  }, []);

  // Connect to database
  const handleConnect = async (conn: ConnectionConfig) => {
    try {
      const info = await dbConnect(conn);
      setActiveConnection(info);

      // Load tables
      const tbls = await dbGetTables(info.id);
      setTables(tbls);
      setExpandedTables(new Set());
      setColumns({});
      setSelectedTable(null);
      setQueryResult(null);
    } catch (e) {
      alert(`Connection failed: ${e}`);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    if (activeConnection) {
      await dbDisconnect(activeConnection.id);
      setActiveConnection(null);
      setTables([]);
      setColumns({});
      setSelectedTable(null);
      setQueryResult(null);
    }
  };

  // Delete connection
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this connection?')) return;
    await deleteConnection(id);
    setConnections(prev => prev.filter(c => c.id !== id));
  };

  // Save connection
  const handleSave = async (conn: ConnectionConfig) => {
    await saveConnection(conn);
    setConnections(await getSavedConnections());
    setShowForm(false);
    setEditingConn(null);
  };

  // Toggle table expansion
  const toggleTable = async (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
      if (!columns[tableName] && activeConnection) {
        try {
          const cols = await dbGetColumns(activeConnection.id, tableName);
          setColumns(prev => ({ ...prev, [tableName]: cols }));
        } catch (e) {
          console.error('Failed to load columns:', e);
        }
      }
    }
    setExpandedTables(newExpanded);
  };

  // Handle table selection
  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
    setDataRefreshKey(k => k + 1);
    setActiveTab('data');
  };

  // Execute query
  const executeQuery = async () => {
    if (!activeConnection || !sql.trim()) return;
    setLoading(true);
    setQueryError(null);
    try {
      const result = await dbQuery(activeConnection.id, sql);
      setQueryResult(result);
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : String(e));
      setQueryResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Insert SQL from AI assistant
  const handleInsertQuery = (newSql: string) => {
    setSql(newSql);
    setActiveTab('query');
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('INT')) return <Hash size={12} />;
    if (t.includes('CHAR') || t.includes('TEXT')) return <Columns size={12} />;
    return <Columns size={12} />;
  };

  const selectedTableColumns = selectedTable ? (columns[selectedTable] || []) : [];

  return (
    <div className="tp-page">
      {/* Left sidebar - Connections */}
      <div className="tp-sidebar">
        <div className="tp-sidebar-header">
          <Database size={16} />
          <span>Connections</span>
          <button
            className="btn-icon-sm"
            onClick={() => { setEditingConn(null); setShowForm(true); }}
            title="New connection"
          >
            <Plus size={14} />
          </button>
        </div>

        <ConnectionList
          connections={connections}
          activeConnection={activeConnection}
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          onDelete={handleDelete}
        />
      </div>

      {/* Schema Browser */}
      {activeConnection && (
        <div className="tp-schema-browser">
          <div className="tp-schema-header">
            <Table size={14} />
            <span>Tables ({tables.length})</span>
            <button
              className="btn-icon-sm"
              onClick={async () => {
                const tbls = await dbGetTables(activeConnection.id);
                setTables(tbls);
              }}
              title="Refresh"
            >
              <RefreshCw size={12} />
            </button>
          </div>

          <div className="tp-schema-tree">
            {tables.map(table => (
              <div key={table.name} className="tp-schema-table">
                <div
                  className={`tp-schema-table-header ${selectedTable === table.name ? 'selected' : ''}`}
                  onClick={() => handleTableSelect(table.name)}
                >
                  <button
                    className="tp-schema-toggle"
                    onClick={e => { e.stopPropagation(); toggleTable(table.name); }}
                  >
                    {expandedTables.has(table.name) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <Table size={14} />
                  <span>{table.name}</span>
                </div>

                {expandedTables.has(table.name) && columns[table.name] && (
                  <div className="tp-schema-columns">
                    {columns[table.name].map(col => (
                      <div key={col.name} className="tp-schema-column">
                        {col.primary_key ? (
                          <Key size={12} className="icon-pk" />
                        ) : (
                          getTypeIcon(col.data_type)
                        )}
                        <span className="col-name">{col.name}</span>
                        <span className="col-type">{col.data_type}</span>
                        {!col.nullable && <span className="col-nn">NN</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="tp-main">
        {/* Tabs */}
        <div className="tp-tabs">
          <button
            className={`tp-tab ${activeTab === 'query' ? 'active' : ''}`}
            onClick={() => setActiveTab('query')}
          >
            <Code size={14} />
            Query
          </button>
          <button
            className={`tp-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <Edit3 size={14} />
            Data
          </button>
          <span className="tp-connection-badge">
            {activeConnection ? activeConnection.name : 'Not connected'}
          </span>
        </div>

        {/* Query Tab */}
        {activeTab === 'query' && (
          <>
            <div className="tp-query-editor">
              <div className="tp-query-toolbar">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={executeQuery}
                  disabled={loading || !activeConnection}
                >
                  <Play size={14} />
                  {loading ? 'Running...' : 'Run'}
                </button>
                <span className="tp-shortcut">⌘+Enter</span>
              </div>

              <textarea
                className="tp-query-textarea"
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    executeQuery();
                  }
                }}
                placeholder={activeConnection ? "Enter SQL query..." : "Connect to a database first..."}
                spellCheck={false}
                disabled={!activeConnection}
              />
            </div>

            {/* Results */}
            <div className="tp-results">
              {queryError && (
                <div className="tp-error">
                  <span>{queryError}</span>
                </div>
              )}

              {queryResult && (
                <>
                  <div className="tp-results-meta">
                    {queryResult.row_count} rows • {queryResult.execution_time_ms}ms
                  </div>

                  <div className="tp-results-grid-wrapper">
                    <table className="tp-results-grid">
                      <thead>
                        <tr>
                          {queryResult.columns.map((col, i) => (
                            <th key={i}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.slice(0, 100).map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td key={j} className={cell === null ? 'null' : ''}>
                                {cell === null ? <span className="null-text">NULL</span> : cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {queryResult.row_count > 100 && (
                      <div className="tp-results-truncated">
                        Showing first 100 of {queryResult.row_count} rows
                      </div>
                    )}
                  </div>
                </>
              )}

              {!activeConnection && (
                <div className="tp-empty-results">
                  <Database size={48} />
                  <p>Connect to a database to get started</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Data Tab */}
        {activeTab === 'data' && (
          <DataGrid
            connId={activeConnection?.id || ''}
            tableName={selectedTable}
            columns={selectedTableColumns}
            refreshKey={dataRefreshKey}
          />
        )}
      </div>

      {/* AI Assistant */}
      {activeConnection && (
        <AIAssistant
          tableName={selectedTable}
          columns={selectedTableColumns}
          onInsertQuery={handleInsertQuery}
        />
      )}

      {/* Connection Form Modal */}
      {showForm && (
        <ConnectionForm
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingConn(null); }}
          initial={editingConn || undefined}
        />
      )}
    </div>
  );
}
