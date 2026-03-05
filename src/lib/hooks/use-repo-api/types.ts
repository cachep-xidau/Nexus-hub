// ── Shared Helpers ───────────────────────────────────────────────────────────

export const isoToTimestamp = (iso: string): number => new Date(iso).getTime();

export const timestampToIso = (ts: number): string => new Date(ts).toISOString();

export interface BaseEntity {
  createdAt: string;
  updatedAt: string;
}

// ── API Types (NestJS backend) ───────────────────────────────────────────────

export interface ApiProject extends BaseEntity {
  id: string;
  name: string;
  description: string | null;
  prdContent: string | null;
  epicsContent: string | null;
  companyId: string;
  _count?: {
    features: number;
    artifacts: number;
    connections: number;
  };
}

export interface ApiCompany extends BaseEntity {
  id: string;
  name: string;
  description: string | null;
  projects?: ApiProject[];
}

export interface ApiFunction extends BaseEntity {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  featureId: string;
  artifacts?: ApiArtifact[];
  _count?: { artifacts: number };
}

export interface ApiFeature extends BaseEntity {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  projectId: string;
  functions?: ApiFunction[];
}

export interface ApiArtifact extends BaseEntity {
  id: string;
  type: string;
  title: string;
  content: string;
  version: number;
  status: string;
  sourceHash: string | null;
  functionId: string | null;
  projectId: string | null;
  epicId: string | null;
  storyId: string | null;
}

export interface ApiAnalysisDoc extends BaseEntity {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  metadata: string | null;
  projectId: string;
}

export interface ApiMcpConnection extends BaseEntity {
  id: string;
  name: string;
  type: string;
  config: string;
  status: string;
  toolCount: number;
  projectId: string;
}

export interface ApiStory {
  id: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  sortOrder: number;
  epicId: string;
  createdAt: string;
}

export interface ApiEpic extends BaseEntity {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  projectId: string;
  stories?: ApiStory[];
}

// ── Legacy UI-compatible types (snake_case) ─────────────────────────────────

export interface RepoProject {
  id: string;
  name: string;
  description: string | null;
  prd_content: string | null;
  epics_content: string | null;
  company_id: string;
  created_at: number;
  updated_at: number;
  _count?: {
    features: number;
    artifacts: number;
    connections: number;
  };
}

export interface RepoCompany {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
  projects?: RepoProject[];
}

export interface RepoFunction {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  feature_id: string;
  created_at: number;
  updated_at: number;
  artifacts?: RepoArtifact[];
  _count?: { artifacts: number };
}

export interface RepoFeature {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  project_id: string;
  created_at: number;
  updated_at: number;
  functions?: RepoFunction[];
}

export interface RepoArtifact {
  id: string;
  type: string;
  title: string;
  content: string;
  version: number;
  status: string;
  source_hash: string | null;
  function_id: string | null;
  project_id: string | null;
  epic_id: string | null;
  story_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface AnalysisDoc {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  metadata: string | null;
  project_id: string;
  created_at: number;
  updated_at: number;
}

export interface McpConnection {
  id: string;
  name: string;
  type: string;
  config: string;
  status: string;
  tool_count: number;
  project_id: string;
  created_at: number;
  updated_at: number;
}

export interface RepoStory {
  id: string;
  title: string;
  description: string | null;
  acceptance_criteria: string | null;
  sort_order: number;
  epic_id: string;
  created_at: number;
}

export interface RepoEpic {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  project_id: string;
  created_at: number;
  stories?: RepoStory[];
}

// ── Input DTOs ───────────────────────────────────────────────────────────────

export type CreateProjectInput = {
  name: string;
  description?: string;
  company_id?: string;
  companyId?: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
  prd_content?: string;
  prdContent?: string;
  epics_content?: string;
  epicsContent?: string;
  company_id?: string;
  companyId?: string;
};

export type CreateCompanyInput = {
  name: string;
  description?: string;
};

export type UpdateCompanyInput = {
  name?: string;
  description?: string;
};

export type CreateFeatureInput = {
  name: string;
  description?: string;
};

export type UpdateFeatureInput = {
  name?: string;
  description?: string;
};

export type CreateFunctionInput = {
  name: string;
  description?: string;
};

export type UpdateFunctionInput = {
  name?: string;
  description?: string;
};

export type CreateArtifactInput = {
  type: string;
  title: string;
  content: string;
  functionId?: string;
  projectId?: string;
  epicId?: string;
  storyId?: string;
  sourceHash?: string;
};

export type UpdateArtifactInput = {
  title?: string;
  content?: string;
  status?: string;
};

export type CreateAnalysisDocInput = {
  type: string;
  title: string;
  content?: string;
  status?: string;
};

export type UpdateAnalysisDocInput = {
  content?: string;
  status?: string;
  metadata?: string;
};

export type CreateMcpConnectionInput = {
  name: string;
  type: string;
  config: string;
};

export type UpdateMcpConnectionInput = {
  status?: string;
  tool_count?: number;
  toolCount?: number;
  config?: string;
};

export type CreateEpicInput = {
  title: string;
  description?: string;
};

export type CreateStoryInput = {
  title: string;
  description?: string;
  acceptance_criteria?: string;
  acceptanceCriteria?: string;
};
