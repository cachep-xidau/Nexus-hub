import type { RepoCompany, RepoProject } from './hooks/use-repo-api/types';

export const LEGACY_COMPANY_ID = 'legacy-default';
const LEGACY_COMPANY_NAME = 'My Projects';

export function normalizeProjectCompanyId(companyId?: string | null): string {
  const value = companyId?.trim();
  return value && value.length > 0 ? value : LEGACY_COMPANY_ID;
}

function defaultCompanyName(companyId: string): string {
  return companyId === LEGACY_COMPANY_ID ? LEGACY_COMPANY_NAME : `Company ${companyId.slice(0, 8)}`;
}

export function deriveCompaniesFromProjects(projects: RepoProject[]): RepoCompany[] {
  const companyMap = new Map<string, RepoCompany>();
  for (const project of projects) {
    const companyId = normalizeProjectCompanyId(project.company_id);
    const existing = companyMap.get(companyId);
    if (existing) {
      existing.updated_at = Math.max(existing.updated_at, project.updated_at);
      continue;
    }
    companyMap.set(companyId, {
      id: companyId,
      name: defaultCompanyName(companyId),
      description: null,
      created_at: project.created_at,
      updated_at: project.updated_at,
    });
  }

  return [...companyMap.values()].sort((a, b) => b.updated_at - a.updated_at);
}

export function buildEffectiveCompanies(companies: RepoCompany[] | undefined, projects: RepoProject[]): RepoCompany[] {
  const derived = deriveCompaniesFromProjects(projects);
  if (!companies || companies.length === 0) return derived;

  const existingIds = new Set(companies.map(company => company.id));
  const missing = derived.filter(company => !existingIds.has(company.id));
  return [...companies, ...missing];
}
