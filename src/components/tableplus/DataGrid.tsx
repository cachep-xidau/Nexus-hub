import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, X, RefreshCw } from 'lucide-react';
import { dbQuery, dbExecuteWithParams, type ColumnInfo, type DatabaseType } from '../../lib/tableplus-db';

interface Props {
  connId: string;
  tableName: string | null;
  columns: ColumnInfo[];
  dbType?: DatabaseType;
  refreshKey?: number;
}

interface RowData {
  [key: string]: string | null;
}

export function DataGrid({ connId, tableName, columns, dbType, refreshKey }: Props) {
  const PAGE_SIZE = 100;
  const [data, setData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newRow, setNewRow] = useState<RowData | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  const quoteIdentifier = useCallback((identifier: string) => {
    const safeParts = identifier.split('.').map(part => part.trim()).filter(Boolean);
    if (safeParts.length === 0) return identifier;
    const quote = dbType === 'Mysql' ? '`' : '"';
    const escapePattern = dbType === 'Mysql' ? /`/g : /"/g;
    const escapeReplacement = dbType === 'Mysql' ? '``' : '""';
    return safeParts.map(part => `${quote}${part.replace(escapePattern, escapeReplacement)}${quote}`).join('.');
  }, [dbType]);

  const quotedTableName = useMemo(() => (tableName ? quoteIdentifier(tableName) : ''), [tableName, quoteIdentifier]);

  const mapRows = (cols: string[], rows: (string | null)[][]): RowData[] => rows.map(row => {
    const obj: RowData = {};
    cols.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });

  const loadPage = useCallback(async (startOffset: number, append: boolean) => {
    if (!connId || !tableName) return;

    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const result = await dbQuery(
        connId,
        `SELECT * FROM ${quotedTableName} LIMIT ${PAGE_SIZE} OFFSET ${startOffset}`,
      );
      const rows = mapRows(result.columns, result.rows);
      setData(prev => append ? [...prev, ...rows] : rows);
      setOffset(startOffset + rows.length);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [PAGE_SIZE, connId, quotedTableName, tableName]);

  const loadData = useCallback(async () => {
    setSelectedRows(new Set());
    await loadPage(0, false);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    await loadPage(offset, true);
  }, [hasMore, loadPage, loading, loadingMore, offset]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const pk = columns.find(c => c.primary_key);

  const startEdit = (rowIdx: number, col: string, value: string | null) => {
    setEditingCell({ row: rowIdx, col });
    setEditValue(value ?? '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingCell || !tableName || !pk) return;

    const row = editingCell.row === -1 ? newRow : data[editingCell.row];
    if (!row) return;

    const pkValue = row[pk.name];

    try {
      if (editingCell.row === -1 && newRow) {
        // INSERT
        const cols = Object.keys(newRow).filter(k => newRow[k] !== null && newRow[k] !== '');
        const vals = cols.map(k => newRow[k]);
        const placeholders = cols.map(() => '?').join(', ');
        await dbExecuteWithParams(
          connId,
          `INSERT INTO ${quotedTableName} (${cols.map(c => quoteIdentifier(c)).join(', ')}) VALUES (${placeholders})`,
          vals
        );
        setNewRow(null);
      } else {
        // UPDATE
        await dbExecuteWithParams(
          connId,
          `UPDATE ${quotedTableName} SET ${quoteIdentifier(editingCell.col)} = ? WHERE ${quoteIdentifier(pk.name)} = ?`,
          [editValue, pkValue]
        );
      }
      await loadData();
    } catch (e) {
      alert(`Error: ${e}`);
    }
    cancelEdit();
  };

  const deleteSelected = async () => {
    if (selectedRows.size === 0 || !pk || !tableName) return;

    if (!confirm(`Delete ${selectedRows.size} rows?`)) return;

    try {
      for (const idx of selectedRows) {
        const pkValue = data[idx][pk.name];
        await dbExecuteWithParams(
          connId,
          `DELETE FROM ${quotedTableName} WHERE ${quoteIdentifier(pk.name)} = ?`,
          [pkValue]
        );
      }
      setSelectedRows(new Set());
      await loadData();
    } catch (e) {
      alert(`Error: ${e}`);
    }
  };

  const startNewRow = () => {
    const empty: RowData = {};
    columns.forEach(c => { empty[c.name] = null; });
    setNewRow(empty);
  };

  const renderCell = (row: RowData, col: ColumnInfo, rowIdx: number) => {
    const value = row[col.name];
    const isEditing = editingCell?.row === rowIdx && editingCell?.col === col.name;

    if (isEditing) {
      return (
        <div className="tp-cell-edit">
          <input
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            className="tp-cell-input"
          />
          <button onClick={saveEdit} className="tp-cell-btn"><Save size={12} /></button>
          <button onClick={cancelEdit} className="tp-cell-btn"><X size={12} /></button>
        </div>
      );
    }

    return (
      <div
        className={`tp-cell-value ${value === null ? 'null' : ''} ${col.primary_key ? 'pk' : ''}`}
        onDoubleClick={() => startEdit(rowIdx, col.name, value)}
      >
        {value === null ? <span className="null-text">NULL</span> : String(value).slice(0, 100)}
      </div>
    );
  };

  if (!tableName) {
    return (
      <div className="tp-datagrid-empty">
        <p>Select a table to view data</p>
      </div>
    );
  }

  return (
    <div className="tp-datagrid">
      <div className="tp-datagrid-toolbar">
        <button className="btn btn-sm btn-secondary" onClick={loadData} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
        {pk && (
          <button className="btn btn-sm btn-secondary" onClick={startNewRow}>
            <Plus size={14} />
            Add Row
          </button>
        )}
        {selectedRows.size > 0 && pk && (
          <button className="btn btn-sm" style={{ color: 'var(--error)' }} onClick={deleteSelected}>
            <Trash2 size={14} />
            Delete ({selectedRows.size})
          </button>
        )}
        <span className="tp-row-count">{data.length} rows loaded</span>
        {!pk && <span className="tp-no-pk">No primary key - editing disabled</span>}
      </div>

      <div
        className="tp-datagrid-wrapper"
        onScroll={e => {
          const target = e.currentTarget;
          if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) {
            void loadMore();
          }
        }}
      >
        <table className="tp-datagrid-table">
          <thead>
            <tr>
              <th className="tp-checkbox-col">
                <input
                  type="checkbox"
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedRows(new Set(data.map((_, i) => i)));
                    } else {
                      setSelectedRows(new Set());
                    }
                  }}
                  checked={selectedRows.size === data.length && data.length > 0}
                />
              </th>
              {columns.map(col => (
                <th key={col.name} className={col.primary_key ? 'tp-pk-col' : ''}>
                  {col.primary_key && <span className="tp-pk-badge">PK</span>}
                  {col.name}
                  <span className="tp-col-type">{col.data_type}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {newRow && (
              <tr className="tp-new-row">
                <td className="tp-checkbox-col">NEW</td>
                {columns.map(col => (
                  <td key={col.name}>
                    {renderCell(newRow, col, -1)}
                  </td>
                ))}
              </tr>
            )}
            {data.map((row, idx) => (
              <tr key={idx} className={selectedRows.has(idx) ? 'tp-selected-row' : ''}>
                <td className="tp-checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(idx)}
                    onChange={e => {
                      const newSet = new Set(selectedRows);
                      if (e.target.checked) newSet.add(idx);
                      else newSet.delete(idx);
                      setSelectedRows(newSet);
                    }}
                  />
                </td>
                {columns.map(col => (
                  <td key={col.name}>
                    {renderCell(row, col, idx)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {(loadingMore || hasMore) && (
          <div className="tp-results-truncated" style={{ padding: '0.5rem 0.75rem' }}>
            {loadingMore ? 'Loading 100 more rows...' : 'Scroll down to load 100 more rows'}
          </div>
        )}
      </div>
    </div>
  );
}
