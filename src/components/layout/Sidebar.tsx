import { useEffect, useState } from 'react';
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
  ChevronLeft,
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
  LogOut,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../../lib/auth';
import {
  getDomainBySlug,
  getArticlesByDomain,
  type KnowledgeDomain,
  type ArticleSection,
} from '../../lib/knowledge-db';

const SIDEBAR_COLLAPSED_KEY = 'ui.sidebarCollapsed';
const SIDEBAR_SECTIONS_KEY = 'ui.sidebarSections';

type SidebarSectionKey = 'main' | 'knowledge' | 'channels' | 'system' | 'sanMarketing';
type SidebarSectionState = Record<SidebarSectionKey, boolean>;

const DEFAULT_SECTION_STATE: SidebarSectionState = {
  main: true,
  knowledge: true,
  channels: true,
  system: true,
  sanMarketing: false,
};

const baseMainItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tableplus', label: 'TablePlus', icon: Database },
  { href: '/board/default', label: 'Kanban Board', icon: Kanban },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/agent', label: 'AI Agent', icon: Bot },
];

const knowledgeItems = [
  { href: '/knowledge', label: 'All Domains', icon: BookOpen },
];

const channelItems = [
  { href: '', label: 'Slack', icon: Slack, color: 'var(--slack)' },
  { href: '/gmail', label: 'Gmail', icon: Mail, color: 'var(--gmail)' },
  { href: '', label: 'Telegram', icon: Send, color: 'var(--telegram)' },
];

const sanMarketingItems = [
  { href: '/san-marketing/overview', label: 'Tổng quan', icon: BarChart3 },
  { href: '/san-marketing/reports', label: 'Báo cáo', icon: FileBarChart },
  { href: '/san-marketing/data', label: 'Dữ liệu', icon: HardDrive },
];

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function readStoredSections(): SidebarSectionState {
  try {
    const raw = localStorage.getItem(SIDEBAR_SECTIONS_KEY);
    if (!raw) return DEFAULT_SECTION_STATE;
    const parsed = JSON.parse(raw) as Partial<SidebarSectionState>;
    return { ...DEFAULT_SECTION_STATE, ...parsed };
  } catch {
    return DEFAULT_SECTION_STATE;
  }
}

function SectionToggle({
  title,
  open,
  collapsed,
  onToggle,
}: {
  title: string;
  open: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) return null;
  return (
    <button type="button" className="sidebar-section-title sidebar-section-toggle" onClick={onToggle}>
      <span>{title}</span>
      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
  );
}

function KnowledgeDomainSidebar({
  domainSlug,
  articleSlug,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  domainSlug: string;
  articleSlug: string | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [domain, setDomain] = useState<KnowledgeDomain | null>(null);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getDomainBySlug(domainSlug).then(d => {
      setDomain(d);
      if (!d) return;
      getArticlesByDomain(d.id).then(s => {
        setSections(s);
        const initial: Record<string, boolean> = {};
        s.forEach(sec => {
          initial[sec.section] = true;
        });
        setExpanded(initial);
      });
    });
  }, [domainSlug]);

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-replace-header-wrap">
        <button
          type="button"
          className="sidebar-replace-header"
          onClick={() => navigate('/knowledge')}
          title="Back to Knowledge Hub"
        >
          <ArrowLeft size={16} />
          {domain?.icon && (() => {
            const DomainIcon = ({
              Rocket, Target, PenTool, FileText, BookOpen,
              Lightbulb, BarChart3, Code2, Palette, Shield,
              Zap, Users, Globe, Layers,
            } as Record<string, typeof BookOpen>)[domain.icon] || BookOpen;
            return <DomainIcon size={14} />;
          })()}
          <span className="nav-label">Knowledge Hub</span>
        </button>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {sections.map(s => (
          <div key={s.section}>
            <button
              type="button"
              className="nav-item nav-group-toggle"
              onClick={() => toggleSection(s.section)}
              title={s.section}
            >
              <span className="sidebar-section-label nav-label">{s.section}</span>
              <span className="nav-chevron">
                {expanded[s.section] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>

            {!sidebarCollapsed && expanded[s.section] && (
              <div className="knowledge-nav-articles">
                {s.articles.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    className={`nav-item ${articleSlug === a.slug ? 'active' : ''}`}
                    onClick={() => navigate(`/knowledge/${domainSlug}/${a.slug}`)}
                    title={a.title}
                  >
                    <span className="nav-label">{a.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />
        <button
          type="button"
          className="nav-item sidebar-logout"
          onClick={() => logout().catch(console.error)}
          title="Logout"
        >
          <LogOut className="icon" size={18} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => readStoredCollapsed());
  const [sectionsOpen, setSectionsOpen] = useState<SidebarSectionState>(() => {
    const stored = readStoredSections();
    if (location.pathname.startsWith('/san-marketing')) stored.sanMarketing = true;
    if (location.pathname.startsWith('/knowledge')) stored.knowledge = true;
    return stored;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_SECTIONS_KEY, JSON.stringify(sectionsOpen));
    } catch {
      // ignore
    }
  }, [sectionsOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        setSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleSection = (key: SidebarSectionKey) => {
    setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isKnowledgeSectionOpen = sectionsOpen.knowledge || location.pathname.startsWith('/knowledge');
  const isSanSectionOpen = sectionsOpen.sanMarketing || location.pathname.startsWith('/san-marketing');

  const pathParts = location.pathname.split('/').filter(Boolean);
  const isKnowledgeDomain = pathParts[0] === 'knowledge' && pathParts.length >= 2;
  const domainSlug = isKnowledgeDomain ? pathParts[1] : null;
  const articleSlug = isKnowledgeDomain && pathParts.length >= 3 ? pathParts[2] : null;

  if (isKnowledgeDomain && domainSlug) {
    return (
      <KnowledgeDomainSidebar
        domainSlug={domainSlug}
        articleSlug={articleSlug}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
      />
    );
  }

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-logo">
        <div className="logo-icon">N</div>
        <span className="nav-label">Nexus Hub</span>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(prev => !prev)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        <SectionToggle
          title="Main"
          open={sectionsOpen.main}
          collapsed={sidebarCollapsed}
          onToggle={() => toggleSection('main')}
        />
        {sectionsOpen.main && (
          <>
            {baseMainItems.map(item => (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-item ${location.pathname.startsWith(item.href) ? 'active' : ''}`}
                title={item.label}
              >
                <item.icon className="icon" size={18} />
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}

            <button
              type="button"
              className={`nav-item nav-group-toggle ${sectionsOpen.knowledge ? 'open' : ''}`}
              onClick={() => {
                if (sidebarCollapsed) navigate('/knowledge');
                else toggleSection('knowledge');
              }}
              title="Knowledge Hub"
            >
              <BookOpen className="icon" size={18} />
              <span className="nav-label">Knowledge Hub</span>
              <span className="nav-chevron">
                {isKnowledgeSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>
            {isKnowledgeSectionOpen && !sidebarCollapsed && (
              <div className="nav-sub-items">
                {knowledgeItems.map(item => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`nav-item nav-sub-item ${location.pathname.startsWith(item.href) ? 'active' : ''}`}
                    title={item.label}
                  >
                    <item.icon className="icon" size={16} />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

            <Link
              to="/repo"
              className={`nav-item ${location.pathname.startsWith('/repo') ? 'active' : ''}`}
              title="Repo"
            >
              <Database className="icon" size={18} />
              <span className="nav-label">Repo</span>
            </Link>
          </>
        )}

        <SectionToggle
          title="Channels"
          open={sectionsOpen.channels}
          collapsed={sidebarCollapsed}
          onToggle={() => toggleSection('channels')}
        />
        {sectionsOpen.channels && channelItems.map(item => (
          item.href ? (
            <Link
              key={item.label}
              to={item.href}
              className={`nav-item ${location.pathname === item.href ? 'active' : ''}`}
              title={item.label}
            >
              <item.icon className="icon" size={18} style={{ color: item.color }} />
              <span className="nav-label">{item.label}</span>
            </Link>
          ) : (
            <div key={item.label} className="nav-item" style={{ cursor: 'default' }} title={item.label}>
              <item.icon className="icon" size={18} style={{ color: item.color }} />
              <span className="nav-label">{item.label}</span>
              <span className="badge" style={{ background: item.color, opacity: 0.8, fontSize: '10px' }}>
                —
              </span>
            </div>
          )
        ))}

        <SectionToggle
          title="System"
          open={sectionsOpen.system}
          collapsed={sidebarCollapsed}
          onToggle={() => toggleSection('system')}
        />
        {sectionsOpen.system && (
          <>
            <Link
              to="/settings"
              className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
              title="Settings"
            >
              <Settings className="icon" size={18} />
              <span className="nav-label">Settings</span>
            </Link>

            <button
              type="button"
              className={`nav-item nav-group-toggle ${sectionsOpen.sanMarketing ? 'open' : ''}`}
              onClick={() => {
                if (sidebarCollapsed) navigate('/san-marketing/overview');
                else toggleSection('sanMarketing');
              }}
              title="SAN Marketing"
            >
              <Store className="icon" size={18} />
              <span className="nav-label">SAN Marketing</span>
              <span className="nav-chevron">
                {isSanSectionOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            </button>
            {isSanSectionOpen && !sidebarCollapsed && (
              <div className="nav-sub-items">
                {sanMarketingItems.map(item => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`nav-item nav-sub-item ${location.pathname === item.href ? 'active' : ''}`}
                    title={item.label}
                  >
                    <item.icon className="icon" size={16} />
                    <span className="nav-label">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />
        <button
          type="button"
          className="nav-item sidebar-logout"
          onClick={() => logout().catch(console.error)}
          title="Logout"
        >
          <LogOut className="icon" size={18} />
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
