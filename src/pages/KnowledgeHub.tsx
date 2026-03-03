import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { DomainCards } from '../components/knowledge/domain-cards';
import { KnowledgeLoadingView } from '../components/knowledge/knowledge-loading-view';
import { createKnowledgeMarkdownComponents } from '../components/knowledge/knowledge-markdown-components';
import {
  getDomains,
  getArticlesByDomain,
  getArticleBySlug,
  getDomainBySlug,
  type KnowledgeDomain,
  type KnowledgeArticle,
  type ArticleSection,
} from '../lib/knowledge-db';

function createDomainsFingerprint(domains: KnowledgeDomain[]): string {
  return domains
    .map(domain =>
      [
        domain.id,
        domain.slug,
        domain.name,
        domain.icon,
        domain.description,
        domain.sort_order,
        domain.article_count ?? 0,
      ].join('|')
    )
    .join('||');
}

export function KnowledgeHub() {
  const { domainSlug, articleSlug } = useParams<{ domainSlug?: string; articleSlug?: string }>();
  const navigate = useNavigate();

  const [domains, setDomains] = useState<KnowledgeDomain[]>([]);
  const [sections, setSections] = useState<ArticleSection[]>([]);
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const loadDomains = async () => {
      const initial = await getDomains();
      if (cancelled) return;

      setDomains(initial);
      setLoading(false);

      const initialFingerprint = createDomainsFingerprint(initial);
      refreshTimer = setTimeout(async () => {
        const next = await getDomains();
        if (cancelled) return;

        const nextFingerprint = createDomainsFingerprint(next);
        if (nextFingerprint !== initialFingerprint) {
          setDomains(next);
        }
      }, 1000);
    };

    loadDomains().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!domainSlug) {
      Promise.resolve().then(() => {
        if (!cancelled) setSections([]);
      });
      return () => {
        cancelled = true;
      };
    }

    getDomainBySlug(domainSlug).then(domain => {
      if (!domain || cancelled) return;
      getArticlesByDomain(domain.id).then(data => {
        if (!cancelled) setSections(data);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [domainSlug]);

  useEffect(() => {
    let cancelled = false;

    if (!domainSlug || !articleSlug) {
      Promise.resolve().then(() => {
        if (!cancelled) setArticle(null);
      });
      return () => {
        cancelled = true;
      };
    }

    getArticleBySlug(domainSlug, articleSlug).then(data => {
      if (!cancelled) setArticle(data);
    });

    return () => {
      cancelled = true;
    };
  }, [domainSlug, articleSlug]);

  const handleSelectDomain = (slug: string) => {
    navigate(`/knowledge/${slug}`);
  };

  const handleSelectArticle = (activeDomainSlug: string, activeArticleSlug: string) => {
    navigate(`/knowledge/${activeDomainSlug}/${activeArticleSlug}`);
  };

  useEffect(() => {
    if (domainSlug && !articleSlug && sections.length > 0) {
      const first = sections[0]?.articles[0];
      if (first) {
        navigate(`/knowledge/${domainSlug}/${first.slug}`, { replace: true });
      }
    }
  }, [domainSlug, articleSlug, sections, navigate]);

  const markdownComponents = createKnowledgeMarkdownComponents({
    domainSlug,
    sections,
    onSelectArticle: handleSelectArticle,
  });

  if (loading) {
    return <KnowledgeLoadingView />;
  }

  if (!domainSlug) {
    return (
      <>
        <Header title="Knowledge Hub" subtitle={`${domains.length} knowledge domains`} />
        <div className="page-content">
          <DomainCards domains={domains} onSelect={handleSelectDomain} />
        </div>
      </>
    );
  }

  const currentDomain = domains.find(domain => domain.slug === domainSlug);
  const domainName = currentDomain?.name || domainSlug;
  const subtitle = article
    ? `Knowledge Hub / ${domainName} / ${article.title}`
    : `Knowledge Hub / ${domainName}`;

  return (
    <>
      <Header title={domainName} subtitle={subtitle} />
      <div className="page-content">
        {article ? (
          <article className="knowledge-article">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {article.content}
            </ReactMarkdown>
          </article>
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
