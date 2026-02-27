import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  BookOpen, Search, ArrowLeft,
  Rocket, Target, PenTool, FileText,
  Lightbulb, BarChart3, Code2, Palette, Shield,
  Zap, Users, Globe, Layers,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  getDomains, getArticlesByDomain, getArticleBySlug, getDomainBySlug,
  searchArticles,
  type KnowledgeDomain, type KnowledgeArticle, type ArticleSection,
} from '../lib/knowledge-db';

// ── Icon map + colors (used by DomainCards landing) ──

const ICON_MAP: Record<string, typeof BookOpen> = {
  Rocket, Target, PenTool, FileText, BookOpen,
  Lightbulb, BarChart3, Code2, Palette, Shield,
  Zap, Users, Globe, Layers,
};

const DOMAIN_COLORS: Record<string, { hex: string; rgb: string }> = {
  Rocket:    { hex: '#F97316', rgb: '249, 115, 22' },
  Target:    { hex: '#EF4444', rgb: '239, 68, 68' },
  PenTool:   { hex: '#8B5CF6', rgb: '139, 92, 246' },
  FileText:  { hex: '#06B6D4', rgb: '6, 182, 212' },
  Lightbulb: { hex: '#F59E0B', rgb: '245, 158, 11' },
  BarChart3: { hex: '#3B82F6', rgb: '59, 130, 246' },
  Code2:     { hex: '#10B981', rgb: '16, 185, 129' },
  Palette:   { hex: '#EC4899', rgb: '236, 72, 153' },
  Shield:    { hex: '#6366F1', rgb: '99, 102, 241' },
  Zap:       { hex: '#FBBF24', rgb: '251, 191, 36' },
  Users:     { hex: '#14B8A6', rgb: '20, 184, 166' },
  Globe:     { hex: '#0EA5E9', rgb: '14, 165, 233' },
  Layers:    { hex: '#A855F7', rgb: '168, 85, 247' },
  BookOpen:  { hex: '#6366F1', rgb: '99, 102, 241' },
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
        {domains.map(d => {
          const domainColor = DOMAIN_COLORS[d.icon] || DOMAIN_COLORS.BookOpen;
          return (
            <button
              key={d.id}
              className="knowledge-domain-card"
              onClick={() => onSelect(d.slug)}
              aria-label={`${d.name} — ${d.article_count || 0} bài viết`}
              data-testid={`domain-card-${d.slug}`}
              style={{ '--domain-color': domainColor.hex, '--domain-color-rgb': domainColor.rgb } as React.CSSProperties}
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
          );
        })}
      </div>
    </div>
  );
}

// ── Main Knowledge Hub Page ─────────────────────────
// NOTE: Sidebar navigation is handled by the app Sidebar component (Option C)

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

  // Domain + Article view (sidebar handles back navigation)
  const currentDomain = domains.find(d => d.slug === domainSlug);
  return (
    <>
      <Header
        title={currentDomain?.name || domainSlug}
        subtitle="Knowledge Hub"
      />
      <div className="page-content">
        {article ? (
          <>
            {/* Breadcrumb */}
            <div className="knowledge-breadcrumb">
              <button onClick={() => navigate('/knowledge')} className="knowledge-breadcrumb-link">Knowledge Hub</button>
              <span className="knowledge-breadcrumb-sep">/</span>
              <button onClick={() => navigate(`/knowledge/${domainSlug}`)} className="knowledge-breadcrumb-link">{currentDomain?.name || domainSlug}</button>
              <span className="knowledge-breadcrumb-sep">/</span>
              <span className="knowledge-breadcrumb-current">{article.title}</span>
            </div>
            <article className="knowledge-article" style={{ margin: '0 auto' }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {article.content}
              </ReactMarkdown>
            </article>
          </>
        ) : (
          <div className="knowledge-empty">
            <BookOpen size={48} strokeWidth={1} />
            <p>Chọn bài viết từ sidebar</p>
          </div>
        )}
      </div>
    </>
  );
}
