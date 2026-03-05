// ── Query Keys Factory ──────────────────────────────────────────────────────
// Centralized query key management for React Query

export const repoKeys = {
  all: ['repo'] as const,
  projects: () => [...repoKeys.all, 'projects'] as const,
  projectsByCompany: (companyId: string) => [...repoKeys.projects(), 'company', companyId] as const,
  project: (id: string) => [...repoKeys.all, 'project', id] as const,
  companies: () => [...repoKeys.all, 'companies'] as const,
  company: (id: string) => [...repoKeys.all, 'company', id] as const,
  features: (projectId: string) => [...repoKeys.all, 'features', projectId] as const,
  functions: (featureId: string) => [...repoKeys.all, 'functions', featureId] as const,
  artifact: (id: string) => [...repoKeys.all, 'artifact', id] as const,
  artifactsByProject: (projectId: string) => [...repoKeys.all, 'artifacts', projectId] as const,
  artifactTree: (projectId: string, statusFilter?: string) =>
    [...repoKeys.all, 'artifactTree', projectId, statusFilter ?? 'all'] as const,
  analysisDocs: (projectId: string) => [...repoKeys.all, 'analysis', projectId] as const,
  analysisDoc: (id: string) => [...repoKeys.all, 'analysisDoc', id] as const,
  connections: (projectId: string) => [...repoKeys.all, 'connections', projectId] as const,
  connection: (id: string) => [...repoKeys.all, 'connection', id] as const,
  epics: (projectId: string) => [...repoKeys.all, 'epics', projectId] as const,
  epic: (id: string) => [...repoKeys.all, 'epic', id] as const,
} as const;
