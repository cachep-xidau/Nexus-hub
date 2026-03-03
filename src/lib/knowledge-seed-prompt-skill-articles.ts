export interface PromptSkillSeedArticle {
  section: string;
  title: string;
  slug: string;
  fileKey: string;
  sort_order: number;
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseArticleOrderFromFileName(fileName: string): { hasOrder: boolean; order: number; text: string } {
  const match = fileName.match(/^(\d+)[-_\s]+(.+)$/);
  if (!match) {
    return { hasOrder: false, order: Number.MAX_SAFE_INTEGER, text: fileName };
  }

  return {
    hasOrder: true,
    order: Number.parseInt(match[1], 10),
    text: match[2] || fileName,
  };
}

function humanizeTitleFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.md$/i, '');
  const { text } = parseArticleOrderFromFileName(withoutExt);
  const spaced = text.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) {
    return 'Untitled';
  }

  if (spaced.toLowerCase() === 'overview') {
    return 'Tổng quan';
  }

  return titleCase(spaced);
}

function createSlugFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.md$/i, '');
  const { text } = parseArticleOrderFromFileName(withoutExt);
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'untitled';
}

function comparePromptFiles(fileA: string, fileB: string): number {
  const nameA = fileA.split('/').pop() || fileA;
  const nameB = fileB.split('/').pop() || fileB;
  const parsedA = parseArticleOrderFromFileName(nameA.replace(/\.md$/i, ''));
  const parsedB = parseArticleOrderFromFileName(nameB.replace(/\.md$/i, ''));

  if (parsedA.hasOrder && parsedB.hasOrder && parsedA.order !== parsedB.order) {
    return parsedA.order - parsedB.order;
  }

  if (parsedA.hasOrder !== parsedB.hasOrder) {
    return parsedA.hasOrder ? -1 : 1;
  }

  return nameA.localeCompare(nameB);
}

function normalizePromptSkillTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized) {
    return '';
  }

  if (normalized.toLowerCase() === 'overview') {
    return 'Tổng quan';
  }

  return normalized;
}

function extractFirstLevelHeading(markdown: string): string {
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (!headingMatch) {
    return '';
  }

  return normalizePromptSkillTitle(headingMatch[1]);
}

export async function buildPromptSkillArticles(
  files: Record<string, () => Promise<string>>
): Promise<PromptSkillSeedArticle[]> {
  const fileKeys = Object.keys(files)
    .filter(key => key.toLowerCase().endsWith('.md'))
    .sort(comparePromptFiles);

  const usedSlugs = new Set<string>();

  const articles = await Promise.all(
    fileKeys.map(async (fileKey, index) => {
      const fileName = fileKey.split('/').pop() || `article-${index + 1}.md`;
      const baseSlug = createSlugFromFileName(fileName);
      const loader = files[fileKey];
      const content = loader ? await loader() : '';
      const markdownTitle = extractFirstLevelHeading(content);
      let slug = baseSlug;
      let suffix = 2;

      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }

      usedSlugs.add(slug);

      return {
        section: 'Kỹ thuật Prompt',
        title: markdownTitle || humanizeTitleFromFileName(fileName),
        slug,
        fileKey,
        sort_order: index,
      };
    })
  );

  return articles;
}
