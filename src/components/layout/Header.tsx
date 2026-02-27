import { RefreshCw, Plus } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onSync?: () => void;
  onAdd?: () => void;
  addLabel?: string;
}

export function Header({ title, subtitle, actions, onSync, onAdd, addLabel }: HeaderProps) {
  return (
    <header className="header">
      <div>
        <h1 className="header-title">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="header-actions">
        {onSync && (
          <button className="btn btn-ghost btn-sm" onClick={onSync} title="Sync channels">
            <RefreshCw size={16} />
            Sync
          </button>
        )}
        {onAdd && (
          <button className="btn btn-primary btn-sm" onClick={onAdd}>
            <Plus size={16} />
            {addLabel || 'Add'}
          </button>
        )}
        {actions}
      </div>
    </header>
  );
}
