import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  Rocket,
  Target,
  PenTool,
  FileText,
  Lightbulb,
  Code2,
  Palette,
  Shield,
  Zap,
  Users,
  Globe,
  Layers,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import {
  getDomainBySlug,
  getArticlesByDomain,
  type KnowledgeDomain,
  type ArticleSection,
} from '../../lib/knowledge-db';

// ── Icon map ──
const ICON_MAP: Record<string, typeof BookOpen> = {
  Rocket, Target, PenTool, FileText, BookOpen,
  Lightbulb, BarChart3, Code2, Palette, Shield,
  Zap, Users, Globe, Layers,
};

// ── Static nav data ──
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

// ── Knowledge Domain Sidebar (replace-in-place mode) ──
function KnowledgeDomainSidebar({
  domainSlug,
  articleSlug,
}: {
  domainSlug: string;
  articleSlug: string | null;
}) {
  const navigate = useNavigate();
  const [domain, setDomain] = useState<KnowledgeDomain | null>(null);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getDomainBySlug(domainSlug).then(d => {
      setDomain(d);
      if (d) {
        getArticlesByDomain(d.id).then(s => {
          setSections(s);
          const exp: Record<string, boolean> = {};
          s.forEach(sec => { exp[sec.section] = true; });
          setExpanded(exp);
        });
      }
    });
  }, [domainSlug]);

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const DIcon = ICON_MAP[domain?.icon || ''] || BookOpen;

  return (
    <aside className="sidebar">
      {/* Back header */}
      <button
        className="sidebar-replace-header"
        onClick={() => navigate('/knowledge')}
      >
        <ArrowLeft size={16} />
        <span>Knowledge Hub</span>
      </button>

      {/* Domain title with accent bar */}
      <div className="sidebar-domain-title">
        <DIcon size={18} />
        <span>{domain?.name || domainSlug}</span>
      </div>

      {/* Article tree using native nav classes */}
      <nav className="sidebar-nav">
        {sections.map(s => (
          <div key={s.section}>
            {/* Section toggle — reuse nav-item as toggle */}
            <button
              className="nav-item nav-group-toggle"
              onClick={() => toggleSection(s.section)}
            >
              <span className="sidebar-section-label">{s.section}</span>
              <span className="nav-chevron">
                {expanded[s.section] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>

            {expanded[s.section] && (
              <div className="nav-sub-items">
                {s.articles.map(a => (
                  <button
                    key={a.id}
                    className={`nav-item nav-sub-item ${articleSlug === a.slug ? 'active' : ''}`}
                    onClick={() => navigate(`/knowledge/${domainSlug}/${a.slug}`)}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', padding: '8px 4px' }}>
        <ThemeToggle />
      </div>
    </aside>
  );
}

// ── Main Sidebar ──
export function Sidebar() {
  const location = useLocation();
  const [sanOpen, setSanOpen] = useState(
    location.pathname.startsWith('/san-marketing')
  );

  // Detect knowledge domain mode
  const pathParts = location.pathname.split('/').filter(Boolean);
  const isKnowledgeDomain = pathParts[0] === 'knowledge' && pathParts.length >= 2;
  const domainSlug = isKnowledgeDomain ? pathParts[1] : null;
  const articleSlug = isKnowledgeDomain && pathParts.length >= 3 ? pathParts[2] : null;

  // ── Replace-in-Place: domain mode ──
  if (isKnowledgeDomain && domainSlug) {
    return (
      <KnowledgeDomainSidebar
        domainSlug={domainSlug}
        articleSlug={articleSlug}
      />
    );
  }

  // ── Normal mode ──
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
