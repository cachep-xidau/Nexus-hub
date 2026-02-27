import { getDb } from './db';

// ── Types ───────────────────────────────────────────

export interface KnowledgeDomain {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
  article_count?: number;
}

export interface KnowledgeArticle {
  id: string;
  domain_id: string;
  section: string;
  title: string;
  slug: string;
  content: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface ArticleSection {
  section: string;
  articles: KnowledgeArticle[];
}

// ── Domains ─────────────────────────────────────────

export async function getDomains(): Promise<KnowledgeDomain[]> {
  const d = await getDb();
  const domains = await d.select<KnowledgeDomain[]>(
    'SELECT * FROM knowledge_domains ORDER BY sort_order'
  );
  // Attach article counts
  for (const domain of domains) {
    const rows = await d.select<{ c: number }[]>(
      'SELECT COUNT(*) as c FROM knowledge_articles WHERE domain_id = ?',
      [domain.id]
    );
    domain.article_count = rows[0]?.c || 0;
  }
  return domains;
}

export async function getDomainBySlug(slug: string): Promise<KnowledgeDomain | null> {
  const d = await getDb();
  const rows = await d.select<KnowledgeDomain[]>(
    'SELECT * FROM knowledge_domains WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

// ── Articles ────────────────────────────────────────

export async function getArticlesByDomain(domainId: string): Promise<ArticleSection[]> {
  const d = await getDb();
  const articles = await d.select<KnowledgeArticle[]>(
    'SELECT * FROM knowledge_articles WHERE domain_id = ? ORDER BY sort_order',
    [domainId]
  );

  // Group by section
  const sectionMap = new Map<string, KnowledgeArticle[]>();
  for (const article of articles) {
    const existing = sectionMap.get(article.section) || [];
    existing.push(article);
    sectionMap.set(article.section, existing);
  }

  return Array.from(sectionMap.entries()).map(([section, articles]) => ({
    section,
    articles,
  }));
}

export async function getArticle(id: string): Promise<KnowledgeArticle | null> {
  const d = await getDb();
  const rows = await d.select<KnowledgeArticle[]>(
    'SELECT * FROM knowledge_articles WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

export async function getArticleBySlug(
  domainSlug: string,
  articleSlug: string
): Promise<KnowledgeArticle | null> {
  const d = await getDb();
  const rows = await d.select<KnowledgeArticle[]>(
    `SELECT a.* FROM knowledge_articles a
     JOIN knowledge_domains d ON a.domain_id = d.id
     WHERE d.slug = ? AND a.slug = ? LIMIT 1`,
    [domainSlug, articleSlug]
  );
  return rows[0] || null;
}

export async function searchArticles(query: string): Promise<(KnowledgeArticle & { domain_name: string; domain_slug: string })[]> {
  const d = await getDb();
  const pattern = `%${query}%`;
  return d.select(
    `SELECT a.*, d.name as domain_name, d.slug as domain_slug
     FROM knowledge_articles a
     JOIN knowledge_domains d ON a.domain_id = d.id
     WHERE a.title LIKE ? OR a.content LIKE ?
     ORDER BY a.sort_order
     LIMIT 50`,
    [pattern, pattern]
  );
}

// ── CRUD (for future editing) ───────────────────────

export async function createDomain(data: {
  name: string; slug: string; description?: string; icon?: string; sort_order?: number;
}): Promise<string> {
  const d = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await d.execute(
    'INSERT INTO knowledge_domains (id, name, slug, description, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.name, data.slug, data.description || '', data.icon || 'BookOpen', data.sort_order || 0, now, now]
  );
  return id;
}

export async function createArticle(data: {
  domain_id: string; section: string; title: string; slug: string; content: string; sort_order?: number;
}): Promise<string> {
  const d = await getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  await d.execute(
    'INSERT INTO knowledge_articles (id, domain_id, section, title, slug, content, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, data.domain_id, data.section, data.title, data.slug, data.content, data.sort_order || 0, now, now]
  );
  return id;
}

export async function updateArticle(
  id: string,
  data: { title?: string; content?: string; section?: string }
): Promise<void> {
  const d = await getDb();
  const sets: string[] = [];
  const vals: (string | number)[] = [];
  if (data.title !== undefined) { sets.push('title = ?'); vals.push(data.title); }
  if (data.content !== undefined) { sets.push('content = ?'); vals.push(data.content); }
  if (data.section !== undefined) { sets.push('section = ?'); vals.push(data.section); }
  sets.push('updated_at = ?'); vals.push(Date.now());
  vals.push(id);
  await d.execute(`UPDATE knowledge_articles SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteArticle(id: string): Promise<void> {
  const d = await getDb();
  await d.execute('DELETE FROM knowledge_articles WHERE id = ?', [id]);
}

// ── Seed check ──────────────────────────────────────

export async function isKnowledgeSeeded(): Promise<boolean> {
  const d = await getDb();
  try {
    const rows = await d.select<{ c: number }[]>('SELECT COUNT(*) as c FROM knowledge_domains');
    return (rows[0]?.c || 0) > 0;
  } catch {
    return false;
  }
}
