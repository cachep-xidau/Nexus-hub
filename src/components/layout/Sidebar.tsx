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
  getDomains,
  getArticlesByDomain,
  getDomainBySlug,
  type KnowledgeDomain,
  type ArticleSection,
} from '../../lib/knowledge-db';

// ── Icon map for knowledge domains ──
const ICON_MAP: Record<string, typeof BookOpen> = {
  Rocket, Target, PenTool, FileText, BookOpen,
  Lightbulb, BarChart3, Code2, Palette, Shield,
  Zap, Users, Globe, Layers,
};

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

// ── Knowledge Sub-tree ──
function KnowledgeSubTree() {
  const location = useLocation();
  const navigate = useNavigate();
  const [domains, setDomains] = useState<KnowledgeDomain[]>([]);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Extract current domain/article from URL
  const pathParts = location.pathname.split('/').filter(Boolean); // ['knowledge', domainSlug?, articleSlug?]
  const activeDomainSlug = pathParts[1] || null;
  const activeArticleSlug = pathParts[2] || null;

  // Load domains
  useEffect(() => {
    getDomains().then(setDomains).catch(console.error);
  }, []);

  // Load articles when domain changes
  useEffect(() => {
    if (activeDomainSlug) {
      getDomainBySlug(activeDomainSlug).then(d => {
        if (d) {
          getArticlesByDomain(d.id).then(s => {
            setSections(s);
            // Auto-expand all sections
            const exp: Record<string, boolean> = {};
            s.forEach(sec => { exp[sec.section] = true; });
            setExpandedSections(exp);
          });
        }
      });
    } else {
      setSections([]);
    }
  }, [activeDomainSlug]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="nav-sub-items knowledge-tree">
      {/* Domain list */}
      {domains.map(d => {
        const DIcon = ICON_MAP[d.icon] || BookOpen;
        const isActive = activeDomainSlug === d.slug;
        return (
          <button
            key={d.id}
            className={`nav-item nav-sub-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(`/knowledge/${d.slug}`)}
          >
            <DIcon className="icon" size={16} />
            {d.name}
          </button>
        );
      })}

      {/* Article tree (only when a domain is selected) */}
      {activeDomainSlug && sections.length > 0 && (
        <div className="knowledge-article-tree">
          {sections.map(s => (
            <div key={s.section}>
              <button
                className="knowledge-tree-section-toggle"
                onClick={() => toggleSection(s.section)}
              >
                {expandedSections[s.section] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <span>{s.section}</span>
              </button>
              {expandedSections[s.section] && (
                <div className="knowledge-tree-items">
                  {s.articles.map(a => (
                    <button
                      key={a.id}
                      className={`knowledge-tree-item ${activeArticleSlug === a.slug ? 'active' : ''}`}
                      onClick={() => navigate(`/knowledge/${activeDomainSlug}/${a.slug}`)}
                    >
                      {a.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const location = useLocation();
  const isKnowledge = location.pathname.startsWith('/knowledge');
  const [sanOpen, setSanOpen] = useState(
    location.pathname.startsWith('/san-marketing')
  );
  const [knowledgeOpen, setKnowledgeOpen] = useState(isKnowledge);

  // Auto-open when navigating to knowledge
  useEffect(() => {
    if (isKnowledge) setKnowledgeOpen(true);
  }, [isKnowledge]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">N</div>
        <span>Nexus Hub</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">Main</div>
        {navItems.map((item) => {
          // Knowledge Hub gets special handling — collapsible
          if (item.href === '/knowledge') {
            return (
              <div key={item.href}>
                <button
                  className={`nav-item nav-group-toggle ${isKnowledge ? 'active' : ''} ${knowledgeOpen ? 'open' : ''}`}
                  onClick={() => setKnowledgeOpen(!knowledgeOpen)}
                >
                  <item.icon className="icon" size={18} />
                  {item.label}
                  <span className="nav-chevron">
                    {knowledgeOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </button>

                {knowledgeOpen && <KnowledgeSubTree />}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-item ${location.pathname.startsWith(item.href) ? 'active' : ''}`}
            >
              <item.icon className="icon" size={18} />
              {item.label}
            </Link>
          );
        })}

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
