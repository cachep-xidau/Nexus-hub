/**
 * Knowledge Hub — Seed Script
 * Loads markdown files via import.meta.glob and seeds into SQLite on first run.
 */

import { isKnowledgeSeeded, createDomain, createArticle } from './knowledge-db';

// ── Glob imports (resolved at Vite build time) ──────
const bmadFiles = import.meta.glob('/knowledge/bmad/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const bsaFiles = import.meta.glob('/knowledge/bsa-solution-design/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const pmFiles = import.meta.glob('/knowledge/product-manager/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const docsFiles = import.meta.glob('/knowledge/docs/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

// ── Domain definitions ──────────────────────────────

interface SeedArticle {
  section: string;
  title: string;
  slug: string;
  fileKey: string;   // glob key like '/knowledge/bmad/01-xxx.md'
  sort_order: number;
}

interface SeedDomain {
  name: string;
  slug: string;
  description: string;
  icon: string;
  sort_order: number;
  files: Record<string, () => Promise<string>>;
  articles: SeedArticle[];
}

const SEED_DOMAINS: SeedDomain[] = [
  {
    name: 'BMAD Method',
    slug: 'bmad',
    description: 'Breakthrough Method of Agile AI‑Driven Development',
    icon: 'Rocket',
    sort_order: 0,
    files: bmadFiles,
    articles: [
      // Giới thiệu
      { section: 'Giới thiệu', title: 'Tổng Quan BMAD Method', slug: 'tong-quan', fileKey: '/knowledge/bmad/01-tong-quan-bmad-method.md', sort_order: 0 },
      { section: 'Giới thiệu', title: 'Kiến Trúc Hệ Thống', slug: 'kien-truc', fileKey: '/knowledge/bmad/02-kien-truc-he-thong.md', sort_order: 1 },
      { section: 'Giới thiệu', title: 'Ba Track Lập Kế Hoạch', slug: 'ba-track', fileKey: '/knowledge/bmad/03-ba-track-lap-ke-hoach.md', sort_order: 2 },
      // Hướng dẫn sử dụng
      { section: 'Hướng dẫn sử dụng', title: 'Workflow-Agent-Skill Reference', slug: 'workflow-agent-skill', fileKey: '/knowledge/bmad/04-workflow-agent-skill-reference.md', sort_order: 3 },
      { section: 'Hướng dẫn sử dụng', title: 'Danh Sách Agents', slug: 'danh-sach-agents', fileKey: '/knowledge/bmad/05-danh-sach-agents.md', sort_order: 4 },
      { section: 'Hướng dẫn sử dụng', title: 'Danh Sách Workflows', slug: 'danh-sach-workflows', fileKey: '/knowledge/bmad/06-danh-sach-workflows.md', sort_order: 5 },
      { section: 'Hướng dẫn sử dụng', title: 'Tùy Chỉnh Agent', slug: 'tuy-chinh-agent', fileKey: '/knowledge/bmad/07-tuy-chinh-agent.md', sort_order: 6 },
      { section: 'Hướng dẫn sử dụng', title: 'Quy Tắc & Tính Năng Đặc Biệt', slug: 'quy-tac', fileKey: '/knowledge/bmad/08-quy-tac-va-tinh-nang-dac-biet.md', sort_order: 7 },
      // Ví dụ thực hành
      { section: 'Ví dụ thực hành', title: 'Ví Dụ Full BMad Method', slug: 'vi-du-full', fileKey: '/knowledge/bmad/09-vi-du-full-bmad-method.md', sort_order: 8 },
      { section: 'Ví dụ thực hành', title: 'Ví Dụ Quick Flow & Brownfield', slug: 'vi-du-quick-flow', fileKey: '/knowledge/bmad/10-vi-du-quick-flow-va-brownfield.md', sort_order: 9 },
      { section: 'Ví dụ thực hành', title: 'Quick Reference Card', slug: 'quick-reference', fileKey: '/knowledge/bmad/11-quick-reference-card.md', sort_order: 10 },
    ],
  },
  {
    name: 'Product Manager',
    slug: 'product-manager',
    description: 'Hướng dẫn toàn diện về Product Management trong kỷ nguyên AI',
    icon: 'Target',
    sort_order: 1,
    files: pmFiles,
    articles: [
      { section: 'Nền tảng PM', title: 'Tổng Quan Product Management', slug: 'tong-quan-pm', fileKey: '/knowledge/product-manager/01-tong-quan-product-management.md', sort_order: 0 },
      { section: 'Nền tảng PM', title: 'Product Discovery', slug: 'product-discovery', fileKey: '/knowledge/product-manager/02-product-discovery.md', sort_order: 1 },
      { section: 'Nền tảng PM', title: 'PRD & Requirements', slug: 'prd-va-requirements', fileKey: '/knowledge/product-manager/03-prd-va-requirements.md', sort_order: 2 },
      { section: 'Execution', title: 'Metrics & Analytics', slug: 'metrics-and-analytics', fileKey: '/knowledge/product-manager/04-metrics-and-analytics.md', sort_order: 3 },
      { section: 'Execution', title: 'Roadmap Planning', slug: 'roadmap-planning', fileKey: '/knowledge/product-manager/05-roadmap-planning.md', sort_order: 4 },
      { section: 'Execution', title: 'Workflow-Agent-Skill Reference', slug: 'workflow-agent-skill-pm', fileKey: '/knowledge/product-manager/06-workflow-agent-skill.md', sort_order: 5 },
    ],
  },
  {
    name: 'BSA Solution Design',
    slug: 'bsa-solution-design',
    description: 'Hướng dẫn thiết kế giải pháp cho Business Systems Analysts',
    icon: 'PenTool',
    sort_order: 2,
    files: bsaFiles,
    articles: [
      { section: 'Nền tảng BSA', title: 'Tổng Quan BSA Solution Design', slug: 'tong-quan-bsa', fileKey: '/knowledge/bsa-solution-design/01-tong-quan-bsa-solution-design.md', sort_order: 0 },
      { section: 'Nền tảng BSA', title: 'Requirements Analysis', slug: 'requirements-analysis', fileKey: '/knowledge/bsa-solution-design/02-requirements-analysis.md', sort_order: 1 },
      { section: 'Design & Modeling', title: 'Solution Design Document', slug: 'solution-design-document', fileKey: '/knowledge/bsa-solution-design/03-solution-design-document.md', sort_order: 2 },
      { section: 'Design & Modeling', title: 'Process Modeling (BPMN)', slug: 'process-modeling', fileKey: '/knowledge/bsa-solution-design/04-process-modeling.md', sort_order: 3 },
      { section: 'Nền tảng BSA', title: 'Workflow-Agent-Skill Reference', slug: 'workflow-agent-skill-bsa', fileKey: '/knowledge/bsa-solution-design/05-workflow-agent-skill.md', sort_order: 4 },
    ],
  },
  {
    name: 'Technical Docs',
    slug: 'docs',
    description: 'Technical documentation and guides',
    icon: 'FileText',
    sort_order: 3,
    files: docsFiles,
    articles: [
      { section: 'Technical Guides', title: 'Port ClaudeKit → Antigravity (Bridge Pattern)', slug: 'bridge-ck-agy', fileKey: '/knowledge/docs/Bridge-CK-AGY/README.md', sort_order: 0 },
    ],
  },
];

// ── Seed function ───────────────────────────────────

export async function seedKnowledge(): Promise<void> {
  if (await isKnowledgeSeeded()) return;

  console.log('[Knowledge Hub] Seeding knowledge base...');

  for (const domain of SEED_DOMAINS) {
    const domainId = await createDomain({
      name: domain.name,
      slug: domain.slug,
      description: domain.description,
      icon: domain.icon,
      sort_order: domain.sort_order,
    });

    for (const article of domain.articles) {
      // Load markdown content from glob
      const loader = domain.files[article.fileKey];
      let content = '';
      if (loader) {
        try {
          content = await loader();
        } catch (e) {
          console.warn(`[Knowledge Hub] Failed to load ${article.fileKey}:`, e);
          content = `# ${article.title}\n\n_Content could not be loaded._`;
        }
      } else {
        console.warn(`[Knowledge Hub] File not found in glob: ${article.fileKey}`);
        content = `# ${article.title}\n\n_Content could not be loaded._`;
      }

      await createArticle({
        domain_id: domainId,
        section: article.section,
        title: article.title,
        slug: article.slug,
        content,
        sort_order: article.sort_order,
      });
    }

    console.log(`[Knowledge Hub] Seeded domain: ${domain.name} (${domain.articles.length} articles)`);
  }

  console.log('[Knowledge Hub] Seed complete.');
}
