import type { ArticleSection, KnowledgeArticle } from './knowledge-db';

interface ParsedMarkdownHref {
  fileNameWithoutExt: string;
  fileNameNormalized: string;
  fullPathNormalized: string;
  parentDirNormalized: string | null;
  numericOrder: number | null;
  numericNameNormalized: string;
}

function normalizeToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/%20/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseMarkdownHref(href: string): ParsedMarkdownHref | null {
  if (!href || href.startsWith('#')) {
    return null;
  }

  const cleanHref = href.split('#')[0]?.split('?')[0] || '';
  if (!cleanHref.toLowerCase().endsWith('.md')) {
    return null;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(cleanHref)) {
    return null;
  }

  const decodedHref = safeDecode(cleanHref);
  const segments = decodedHref.split('/').filter(Boolean);
  const fileName = segments[segments.length - 1];
  if (!fileName) {
    return null;
  }

  const fileNameWithoutExt = fileName.replace(/\.md$/i, '');
  const fileNameNormalized = normalizeToken(fileNameWithoutExt);
  const relativePathWithoutExt = decodedHref
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .replace(/\.md$/i, '');

  const numericMatch = fileNameWithoutExt.match(/^(\d+)[-_\s]+(.+)$/);
  const numericOrder = numericMatch ? Number.parseInt(numericMatch[1], 10) : null;
  const numericNameNormalized = numericMatch ? normalizeToken(numericMatch[2] || '') : '';

  return {
    fileNameWithoutExt,
    fileNameNormalized,
    fullPathNormalized: normalizeToken(relativePathWithoutExt.replace(/\//g, '-')),
    parentDirNormalized: segments.length > 1 ? normalizeToken(segments[segments.length - 2]) : null,
    numericOrder: Number.isNaN(numericOrder) ? null : numericOrder,
    numericNameNormalized,
  };
}

function matchByNumericPrefix(
  target: ParsedMarkdownHref,
  allArticles: KnowledgeArticle[]
): KnowledgeArticle | null {
  if (target.numericOrder === null) {
    return null;
  }

  const expectedSortOrder = target.numericOrder - 1;
  const byOrder = allArticles.filter(article => article.sort_order === expectedSortOrder);
  if (byOrder.length === 1) {
    return byOrder[0];
  }

  if (!target.numericNameNormalized) {
    return byOrder[0] || null;
  }

  const byOrderAndName = byOrder.find(article => {
    const slugToken = normalizeToken(article.slug);
    const titleToken = normalizeToken(article.title);
    return slugToken === target.numericNameNormalized || titleToken === target.numericNameNormalized;
  });

  return byOrderAndName || byOrder[0] || null;
}

function matchByExactName(
  target: ParsedMarkdownHref,
  allArticles: KnowledgeArticle[]
): KnowledgeArticle | null {
  return (
    allArticles.find(article => {
      const slugToken = normalizeToken(article.slug);
      const titleToken = normalizeToken(article.title);
      return (
        slugToken === target.fileNameNormalized ||
        titleToken === target.fileNameNormalized ||
        slugToken === target.fullPathNormalized ||
        titleToken === target.fullPathNormalized
      );
    }) || null
  );
}

function matchReadmeFallback(
  target: ParsedMarkdownHref,
  allArticles: KnowledgeArticle[]
): KnowledgeArticle | null {
  if (target.fileNameNormalized !== 'readme') {
    return null;
  }

  if (target.parentDirNormalized) {
    const byParentDir = allArticles.find(article => {
      const slugToken = normalizeToken(article.slug);
      const titleToken = normalizeToken(article.title);
      return slugToken === target.parentDirNormalized || titleToken === target.parentDirNormalized;
    });
    if (byParentDir) {
      return byParentDir;
    }
  }

  if (allArticles.length === 1) {
    return allArticles[0];
  }

  return (
    allArticles.find(article => normalizeToken(article.slug) === 'readme') ||
    allArticles.slice().sort((a, b) => a.sort_order - b.sort_order)[0] ||
    null
  );
}

function matchByFuzzyName(
  target: ParsedMarkdownHref,
  allArticles: KnowledgeArticle[]
): KnowledgeArticle | null {
  if (target.fileNameNormalized.length < 5) {
    return null;
  }

  const candidates = allArticles.filter(article => {
    const slugToken = normalizeToken(article.slug);
    const titleToken = normalizeToken(article.title);
    return (
      slugToken.includes(target.fileNameNormalized) ||
      target.fileNameNormalized.includes(slugToken) ||
      titleToken.includes(target.fileNameNormalized)
    );
  });

  return candidates.length === 1 ? candidates[0] : null;
}

export function resolveRelativeMarkdownLink(
  href: string,
  sections: ArticleSection[]
): { slug: string } | null {
  const target = parseMarkdownHref(href);
  if (!target) {
    return null;
  }

  const allArticles = sections.flatMap(section => section.articles);
  if (allArticles.length === 0) {
    return null;
  }

  const resolved =
    matchByNumericPrefix(target, allArticles) ||
    matchByExactName(target, allArticles) ||
    matchReadmeFallback(target, allArticles) ||
    matchByFuzzyName(target, allArticles);

  if (!resolved) {
    return null;
  }

  return { slug: resolved.slug };
}
