import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen, Search, ChevronDown, ChevronRight,
  Rocket, Target, PenTool, FileText, ArrowLeft,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  getDomains, getArticlesByDomain, getArticleBySlug, getDomainBySlug,
  searchArticles,
  type KnowledgeDomain, type KnowledgeArticle, type ArticleSection,
} from '../lib/knowledge-db';

// ── Icon map ────────────────────────────────────────

const ICON_MAP: Record<string, typeof BookOpen> = {
  Rocket, Target, PenTool, FileText, BookOpen,
};

function DomainIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] || BookOpen;
  return <Icon size={size} />;
}

// ── Domain Cards (landing) ──────────────────────────

function DomainCards({ domains, onSelect }: {
  domains: KnowledgeDomain[];
  onSelect: (slug: string) => void;
}) {
  return (
    <div className="knowledge-landing">
      <div className="knowledge-landing-header">
        <BookOpen size={28} />
        <div>
          <h1>Knowledge Hub</h1>
          <p className="text-muted">Chọn module để bắt đầu học</p>
        </div>
      </div>
      <div className="knowledge-domain-grid">
        {domains.map(d => (
          <button
            key={d.id}
            className="knowledge-domain-card"
            onClick={() => onSelect(d.slug)}
          >
            <div className="knowledge-domain-card-icon">
              <DomainIcon name={d.icon} size={24} />
            </div>
            <h3>{d.name}</h3>
            <p>{d.description}</p>
            <span className="knowledge-domain-badge">
              {d.article_count || 0} bài viết
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sidebar Tree ────────────────────────────────────

function KnowledgeSidebar({ domains, sections, activeDomain, activeArticle, onSelectDomain, onSelectArticle }: {
  domains: KnowledgeDomain[];
  sections: ArticleSection[];
  activeDomain: string | null;
  activeArticle: string | null;
  onSelectDomain: (slug: string) => void;
  onSelectArticle: (domainSlug: string, articleSlug: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Auto-expand active domain's sections
  useEffect(() => {
    if (activeDomain && sections.length > 0) {
      const autoExpand: Record<string, boolean> = {};
      sections.forEach(s => { autoExpand[s.section] = true; });
      setExpanded(autoExpand);
    }
  }, [activeDomain, sections]);

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="knowledge-sidebar">
      <div className="knowledge-sidebar-domains">
        {domains.map(d => (
          <button
            key={d.id}
            className={`knowledge-sidebar-domain ${activeDomain === d.slug ? 'active' : ''}`}
            onClick={() => onSelectDomain(d.slug)}
            title={d.name}
          >
            <DomainIcon name={d.icon} size={16} />
            <span>{d.name}</span>
          </button>
        ))}
      </div>

      {activeDomain && sections.length > 0 && (
        <div className="knowledge-sidebar-articles">
          {sections.map(s => (
            <div key={s.section} className="knowledge-sidebar-section">
              <button
                className="knowledge-sidebar-section-toggle"
                onClick={() => toggleSection(s.section)}
              >
                {expanded[s.section] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{s.section}</span>
              </button>

              {expanded[s.section] && (
                <div className="knowledge-sidebar-items">
                  {s.articles.map(a => (
                    <button
                      key={a.id}
                      className={`knowledge-sidebar-item ${activeArticle === a.slug ? 'active' : ''}`}
                      onClick={() => onSelectArticle(activeDomain, a.slug)}
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

// ── Main Knowledge Hub Page ─────────────────────────

export function KnowledgeHub() {
  const { domainSlug, articleSlug } = useParams<{ domainSlug?: string; articleSlug?: string }>();
  const navigate = useNavigate();

  const [domains, setDomains] = useState<KnowledgeDomain[]>([]);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(KnowledgeArticle & { domain_name: string; domain_slug: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Load domains
  useEffect(() => {
    getDomains().then(d => {
      setDomains(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Load articles for active domain
  useEffect(() => {
    if (domainSlug) {
      getDomainBySlug(domainSlug).then(d => {
        if (d) {
          getArticlesByDomain(d.id).then(setSections);
        }
      });
    } else {
      setSections([]);
    }
  }, [domainSlug]);

  // Load active article
  useEffect(() => {
    if (domainSlug && articleSlug) {
      getArticleBySlug(domainSlug, articleSlug).then(setArticle);
    } else {
      setArticle(null);
    }
  }, [domainSlug, articleSlug]);

  // Search (debounced)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (searchQuery.trim().length > 1) {
      searchTimerRef.current = setTimeout(() => {
        searchArticles(searchQuery.trim()).then(setSearchResults);
      }, 300);
    } else {
      setSearchResults([]);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [searchQuery]);

  const handleSelectDomain = (slug: string) => {
    navigate(`/knowledge/${slug}`);
    setSearchQuery('');
  };

  const handleSelectArticle = (dSlug: string, aSlug: string) => {
    navigate(`/knowledge/${dSlug}/${aSlug}`);
    setSearchQuery('');
  };

  // Auto-select first article when entering domain without article
  useEffect(() => {
    if (domainSlug && !articleSlug && sections.length > 0) {
      const first = sections[0]?.articles[0];
      if (first) {
        navigate(`/knowledge/${domainSlug}/${first.slug}`, { replace: true });
      }
    }
  }, [domainSlug, articleSlug, sections, navigate]);

  // Markdown link handler — make relative .md links work
  const markdownComponents = useMemo(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    a: ({ href, children }: any) => {
      if (href && href.startsWith('./') && href.endsWith('.md') && domainSlug) {
        const match = href.match(/\.\/(\d+)-([^.]+)\.md/);
        if (match) {
          const fileNum = match[1];
          const allArticles = sections.flatMap(s => s.articles);
          const target = allArticles.find(a => {
            // Match by checking if the article's content was loaded from a file starting with this number
            return a.sort_order === parseInt(fileNum) - 1;
          });
          if (target) {
            return (
              <a
                href={`/knowledge/${domainSlug}/${target.slug}`}
                onClick={(e) => { e.preventDefault(); handleSelectArticle(domainSlug, target.slug); }}
              >
                {children}
              </a>
            );
          }
        }
      }
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
    },
  }), [domainSlug, sections]);

  if (loading) {
    return (
      <>
        <Header title="Knowledge Hub" subtitle="Loading..." />
        <div className="page-content">
          <div className="knowledge-landing">
            <div className="knowledge-landing-header">
              <BookOpen size={28} />
              <div>
                <h1>Knowledge Hub</h1>
                <p className="text-muted">Đang tải...</p>
              </div>
            </div>
            <div className="knowledge-domain-grid">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="knowledge-domain-card skeleton" style={{ minHeight: 160 }}>
                  <div className="skeleton-line" style={{ width: '40%', height: 44, borderRadius: 'var(--radius-md)' }} />
                  <div className="skeleton-line" style={{ width: '70%', height: 16, marginTop: 8 }} />
                  <div className="skeleton-line" style={{ width: '90%', height: 14, marginTop: 4 }} />
                  <div className="skeleton-line" style={{ width: '30%', height: 12, marginTop: 'auto' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Landing page (no domain selected)
  if (!domainSlug) {
    const showSearch = searchQuery.trim().length > 1;
    return (
      <>
        <Header title="Knowledge Hub" subtitle={`${domains.length} knowledge domains`} />
        <div className="page-content">
          <div className="knowledge-search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm bài viết trong Knowledge Hub"
            />
          </div>

          {showSearch ? (
            <div className="knowledge-search-results">
              <h3>{searchResults.length} kết quả cho "{searchQuery}"</h3>
              {searchResults.map(r => (
                <button
                  key={r.id}
                  className="knowledge-search-result"
                  onClick={() => handleSelectArticle(r.domain_slug, r.slug)}
                >
                  <span className="knowledge-search-result-domain">{r.domain_name}</span>
                  <span className="knowledge-search-result-title">{r.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <DomainCards domains={domains} onSelect={handleSelectDomain} />
          )}
        </div>
      </>
    );
  }

  // Domain + Article view
  return (
    <>
      <Header
        title="Knowledge Hub"
        subtitle={domains.find(d => d.slug === domainSlug)?.name || domainSlug}
      />
      <div className="knowledge-layout">
        <KnowledgeSidebar
          domains={domains}
          sections={sections}
          activeDomain={domainSlug}
          activeArticle={articleSlug || null}
          onSelectDomain={handleSelectDomain}
          onSelectArticle={handleSelectArticle}
        />

        <div className="knowledge-content">
          {/* Back button */}
          <button className="knowledge-back-btn" onClick={() => navigate('/knowledge')}>
            <ArrowLeft size={14} /> All Domains
          </button>

          {article ? (
            <article className="knowledge-article" style={{ margin: '0 auto' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {article.content}
              </ReactMarkdown>
            </article>
          ) : (
            <div className="knowledge-empty">
              <BookOpen size={48} strokeWidth={1} />
              <p>Chọn bài viết từ menu bên trái</p>
              <button className="btn btn-secondary" onClick={() => navigate('/knowledge')}>
                <ArrowLeft size={14} /> Quay lại danh sách
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
