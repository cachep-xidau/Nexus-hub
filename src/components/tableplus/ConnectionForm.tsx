import { useState } from 'react';
import { X } from 'lucide-react';
import type { ConnectionConfig, DatabaseType } from '../../lib/tableplus-db';

interface Props {
  onSave: (conn: ConnectionConfig) => void;
  onCancel: () => void;
  initial?: ConnectionConfig;
}

const DB_DEFAULTS: Record<DatabaseType, { host: string; port: number }> = {
  Postgres: { host: 'localhost', port: 5432 },
  Mysql: { host: 'localhost', port: 3306 },
  Sqlite: { host: '', port: 0 },
};

export function ConnectionForm({ onSave, onCancel, initial }: Props) {
  const [name, setName] = useState(initial?.name || '');
  const [dbType, setDbType] = useState<DatabaseType>(initial?.db_type || 'Sqlite');
  const [host, setHost] = useState(initial?.host || '');
  const [port, setPort] = useState(initial?.port || 5432);
  const [database, setDatabase] = useState(initial?.database || '');
  const [username, setUsername] = useState(initial?.username || '');
  const [password, setPassword] = useState('');
  const [filePath, setFilePath] = useState(initial?.file_path || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initial?.id || crypto.randomUUID(),
      name,
      db_type: dbType,
      host: dbType === 'Sqlite' ? undefined : host,
      port: dbType === 'Sqlite' ? undefined : port,
      database: dbType === 'Sqlite' ? undefined : database,
      username: dbType === 'Sqlite' ? undefined : username,
      password: dbType === 'Sqlite' ? undefined : password,
      file_path: dbType === 'Sqlite' ? filePath : undefined,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>{initial ? 'Edit' : 'New'} Connection</h2>
          <button className="btn-icon" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Connection Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Database"
              required
              className="input"
            />
          </div>

          <div className="form-group">
            <label>Database Type</label>
            <select
              value={dbType}
              onChange={e => {
                const t = e.target.value as DatabaseType;
                setDbType(t);
                if (t !== 'Sqlite') {
                  setHost(DB_DEFAULTS[t].host);
                  setPort(DB_DEFAULTS[t].port);
                }
              }}
              className="input"
            >
              <option value="Sqlite">SQLite</option>
              <option value="Postgres">PostgreSQL</option>
              <option value="Mysql">MySQL</option>
            </select>
          </div>

          {dbType === 'Sqlite' ? (
            <div className="form-group">
              <label>File Path</label>
              <input
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
                placeholder="/path/to/database.db"
                required
                className="input"
              />
              <small style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                Path to SQLite database file (will be created if not exists)
              </small>
            </div>
          ) : (
            <>
              <div className="form-row" style={{ display: 'flex', gap: 12 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Host</label>
                  <input
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    placeholder="localhost"
                    required
                    className="input"
                  />
                </div>
                <div className="form-group" style={{ width: 100 }}>
                  <label>Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={e => setPort(Number(e.target.value))}
                    required
                    className="input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Database</label>
                <input
                  value={database}
                  onChange={e => setDatabase(e.target.value)}
                  placeholder="mydb"
                  required
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="postgres"
                  required
                  className="input"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                />
              </div>
            </>
          )}

          <div className="form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
