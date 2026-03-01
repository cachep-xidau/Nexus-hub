import { Database, Server, FileCode2, Trash2, Plug } from 'lucide-react';
import type { ConnectionConfig, ConnectionInfo } from '../../lib/tableplus-db';

interface Props {
  connections: ConnectionConfig[];
  activeConnection: ConnectionInfo | null;
  onConnect: (conn: ConnectionConfig) => void;
  onDisconnect: () => void;
  onDelete: (id: string) => void;
}

const DB_ICONS = {
  Sqlite: FileCode2,
  Postgres: Server,
  Mysql: Database,
};

const DB_COLORS = {
  Sqlite: '#22c55e',
  Postgres: '#3b82f6',
  Mysql: '#f59e0b',
};

export function ConnectionList({
  connections,
  activeConnection,
  onConnect,
  onDisconnect,
  onDelete,
}: Props) {
  return (
    <div className="tp-connection-list">
      {connections.map(conn => {
        const Icon = DB_ICONS[conn.db_type];
        const isActive = activeConnection?.id === conn.id;
        const color = DB_COLORS[conn.db_type];

        return (
          <div key={conn.id} className={`tp-connection-item ${isActive ? 'active' : ''}`}>
            <div className="tp-connection-icon" style={{ color }}>
              <Icon size={18} />
            </div>
            <div className="tp-connection-info">
              <span className="tp-connection-name">{conn.name}</span>
              <span className="tp-connection-type">{conn.db_type}</span>
            </div>
            <div className="tp-connection-actions">
              {isActive ? (
                <button
                  className="btn-icon-sm"
                  onClick={onDisconnect}
                  title="Disconnect"
                  style={{ color: 'var(--success)' }}
                >
                  <Plug size={14} />
                </button>
              ) : (
                <button
                  className="btn-icon-sm"
                  onClick={() => onConnect(conn)}
                  title="Connect"
                >
                  <Plug size={14} />
                </button>
              )}
              <button
                className="btn-icon-sm"
                onClick={() => onDelete(conn.id)}
                title="Delete"
                style={{ color: 'var(--error)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}

      {connections.length === 0 && (
        <div className="tp-empty-state">
          <Database size={32} />
          <p>No connections yet</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Click "+ New" to add a database connection
          </p>
        </div>
      )}
    </div>
  );
}
