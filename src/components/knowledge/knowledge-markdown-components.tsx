import type { ReactNode } from 'react';
import type { Components } from 'react-markdown';
import type { ArticleSection } from '../../lib/knowledge-db';
import { resolveRelativeMarkdownLink } from '../../lib/knowledge-hub-content-link-utils';

export function createKnowledgeMarkdownComponents({
  domainSlug,
  sections,
  onSelectArticle,
}: {
  domainSlug?: string;
  sections: ArticleSection[];
  onSelectArticle: (domainSlug: string, articleSlug: string) => void;
}): Components {
  return {
    a: ({ href, children }) => {
      if (!href || !domainSlug) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children as ReactNode}
          </a>
        );
      }

      const target = resolveRelativeMarkdownLink(href, sections);
      if (!target) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {children as ReactNode}
          </a>
        );
      }

      return (
        <a
          href={`/knowledge/${domainSlug}/${target.slug}`}
          onClick={event => {
            event.preventDefault();
            onSelectArticle(domainSlug, target.slug);
          }}
        >
          {children as ReactNode}
        </a>
      );
    },
  };
}
