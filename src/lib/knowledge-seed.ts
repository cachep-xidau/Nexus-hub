/**
 * Knowledge Hub — Seed Script
 * Loads markdown files via import.meta.glob and seeds into SQLite on first run.
 */

import { getSetting, saveSetting } from './db';
import {
  createArticle,
  createDomain,
  deleteArticle,
  getArticleBySlug,
  getArticlesByDomain,
  getDomainBySlug,
  updateArticle,
} from './knowledge-db';
import {
  getSeedDomains,
  PROMPT_SKILLS_DOMAIN_SLUG,
  type SeedArticle,
  type SeedDomain,
} from './knowledge-seed-domains';

const KNOWLEDGE_SEED_SIGNATURE_KEY = 'knowledge_hub_seed_signature_v1';
const KNOWLEDGE_SEED_SCHEMA_VERSION = '2026-03-01';

interface SeedArticleWithContent extends SeedArticle {
  content: string;
}

interface SeedDomainWithContent extends Omit<SeedDomain, 'articles'> {
  articles: SeedArticleWithContent[];
}

let seedInFlight: Promise<void> | null = null;

// ── Glob imports (resolved at Vite build time) ──────
const bmadFiles = import.meta.glob('/knowledge/bmad/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const bsaFiles = import.meta.glob('/knowledge/bsa-solution-design/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const pmFiles = import.meta.glob('/knowledge/product-manager/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const docsFiles = import.meta.glob('/knowledge/docs/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const promptSkillFiles = import.meta.glob('/docs/System prompt/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

async function loadArticleContent(
  files: Record<string, () => Promise<string>>,
  fileKey: string,
  title: string
): Promise<string> {
  const loader = files[fileKey];
  if (!loader) {
    console.warn(`[Knowledge Hub] File not found in glob: ${fileKey}`);
    return `# ${title}\n\n_Content could not be loaded._`;
  }

  try {
    return await loader();
  } catch (e) {
    console.warn(`[Knowledge Hub] Failed to load ${fileKey}:`, e);
    return `# ${title}\n\n_Content could not be loaded._`;
  }
}

async function prepareDomainForSync(domain: SeedDomain): Promise<SeedDomainWithContent> {
  const articles = await Promise.all(
    domain.articles.map(async article => ({
      ...article,
      content: await loadArticleContent(domain.files, article.fileKey, article.title),
    }))
  );

  return {
    ...domain,
    articles,
  };
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function computeSeedSignature(domains: SeedDomainWithContent[]): Promise<string> {
  const signaturePayload = JSON.stringify(
    domains.map(domain => ({
      slug: domain.slug,
      sort_order: domain.sort_order,
      articles: domain.articles.map(article => ({
        section: article.section,
        title: article.title,
        slug: article.slug,
        fileKey: article.fileKey,
        sort_order: article.sort_order,
        content: article.content,
      })),
    }))
  );

  const payloadHash = await sha256(signaturePayload);
  return `${KNOWLEDGE_SEED_SCHEMA_VERSION}:${payloadHash}`;
}

async function syncDomain(domain: SeedDomainWithContent): Promise<void> {
  const existingDomain = await getDomainBySlug(domain.slug);
  const domainId = existingDomain
    ? existingDomain.id
    : await createDomain({
      name: domain.name,
      slug: domain.slug,
      description: domain.description,
      icon: domain.icon,
      sort_order: domain.sort_order,
    });

  const activeSlugs = new Set<string>();

  for (const article of domain.articles) {
    activeSlugs.add(article.slug);

    const existingArticle = await getArticleBySlug(domain.slug, article.slug);
    if (existingArticle) {
      await updateArticle(existingArticle.id, {
        section: article.section,
        title: article.title,
        content: article.content,
        sort_order: article.sort_order,
      });
    } else {
      await createArticle({
        domain_id: domainId,
        section: article.section,
        title: article.title,
        slug: article.slug,
        content: article.content,
        sort_order: article.sort_order,
      });
    }
  }

  if (domain.slug === PROMPT_SKILLS_DOMAIN_SLUG) {
    const existingSections = await getArticlesByDomain(domainId);
    const existingArticles = existingSections.flatMap(section => section.articles);
    for (const existing of existingArticles) {
      if (!activeSlugs.has(existing.slug)) {
        await deleteArticle(existing.id);
      }
    }
  }

  console.log(`[Knowledge Hub] Synced domain: ${domain.name} (${domain.articles.length} articles)`);
}

async function runSeedKnowledge(): Promise<void> {
  console.log('[Knowledge Hub] Syncing knowledge base...');

  const domains = await getSeedDomains({
    bmadFiles,
    bsaFiles,
    pmFiles,
    docsFiles,
    promptSkillFiles,
  });

  const preparedDomains = await Promise.all(domains.map(prepareDomainForSync));
  const nextSignature = await computeSeedSignature(preparedDomains);
  const previousSignature = await getSetting(KNOWLEDGE_SEED_SIGNATURE_KEY);

  if (previousSignature === nextSignature) {
    console.log('[Knowledge Hub] Seed unchanged. Skip sync.');
    return;
  }

  for (const domain of preparedDomains) {
    await syncDomain(domain);
  }

  await saveSetting(KNOWLEDGE_SEED_SIGNATURE_KEY, nextSignature);
  console.log('[Knowledge Hub] Sync complete.');
}

// ── Seed function ───────────────────────────────────
export async function seedKnowledge(): Promise<void> {
  if (seedInFlight) {
    return seedInFlight;
  }

  seedInFlight = runSeedKnowledge().finally(() => {
    seedInFlight = null;
  });

  return seedInFlight;
}
