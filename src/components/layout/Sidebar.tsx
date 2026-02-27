import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  Inbox,
  Bot,
  Settings,
  Slack,
  Mail,
  Send,
  Database,
  ChevronDown,
  ChevronRight,
  Store,
  BarChart3,
  FileBarChart,
  HardDrive,
  BookOpen,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/knowledge', label: 'Knowledge Hub', icon: BookOpen },
  { href: '/repo', label: 'Repo', icon: Database },
  { href: '/board/default', label: 'Kanban Board', icon: Kanban },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/agent', label: 'AI Agent', icon: Bot },
];

const channelItems = [
  { label: 'Slack', icon: Slack, color: 'var(--slack)' },
  { label: 'Gmail', icon: Mail, color: 'var(--gmail)' },
  { label: 'Telegram', icon: Send, color: 'var(--telegram)' },
];

const sanMarketingItems = [
  { href: '/san-marketing/overview', label: 'Tổng quan', icon: BarChart3 },
  { href: '/san-marketing/reports', label: 'Báo cáo', icon: FileBarChart },
  { href: '/san-marketing/data', label: 'Dữ liệu', icon: HardDrive },
];

export function Sidebar() {
  const location = useLocation();
  const [sanOpen, setSanOpen] = useState(
    location.pathname.startsWith('/san-marketing')
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">N</div>
        <span>Nexus Hub</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Main</div>
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`nav-item ${location.pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <item.icon className="icon" size={18} />
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-title">Channels</div>
        {channelItems.map((item) => (
          <div key={item.label} className="nav-item" style={{ cursor: 'default' }}>
            <item.icon className="icon" size={18} style={{ color: item.color }} />
            {item.label}
            <span className="badge" style={{ background: item.color, opacity: 0.8, fontSize: '10px' }}>
              —
            </span>
          </div>
        ))}

        <div className="sidebar-section-title">System</div>
        <Link
          to="/settings"
          className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
        >
          <Settings className="icon" size={18} />
          Settings
        </Link>

        {/* SAN Marketing — collapsible */}
        <button
          className={`nav-item nav-group-toggle ${sanOpen ? 'open' : ''}`}
          onClick={() => setSanOpen(!sanOpen)}
        >
          <Store className="icon" size={18} />
          SAN Marketing
          <span className="nav-chevron">
            {sanOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>

        {sanOpen && (
          <div className="nav-sub-items">
            {sanMarketingItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-item nav-sub-item ${location.pathname === item.href ? 'active' : ''}`}
              >
                <item.icon className="icon" size={16} />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      <div style={{ marginTop: 'auto', padding: '8px 4px' }}>
        <ThemeToggle />
      </div>
    </aside>
  );
}
