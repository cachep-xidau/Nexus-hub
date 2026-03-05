// ── Local Storage Fallback for Repo Data ──────────────────────────────────
// Used when the backend API is not available (browser-only dev mode).
// Stores repos data in localStorage as a simple JSON store.

import type {
    RepoCompany,
    RepoProject,
    RepoFeature,
    RepoFunction,
    RepoArtifact,
    AnalysisDoc,
    McpConnection,
    RepoEpic,
    RepoStory,
    CreateProjectInput,
    CreateCompanyInput,
    UpdateProjectInput,
    UpdateCompanyInput,
    CreateFeatureInput,
    UpdateFeatureInput,
    CreateFunctionInput,
    UpdateFunctionInput,
    CreateArtifactInput,
    UpdateArtifactInput,
    CreateAnalysisDocInput,
    UpdateAnalysisDocInput,
    CreateMcpConnectionInput,
    UpdateMcpConnectionInput,
    CreateEpicInput,
    CreateStoryInput,
} from './hooks/use-repo-api/types';

const LS_KEY = 'nexus_repo_local';

interface LocalStore {
    companies: RepoCompany[];
    projects: RepoProject[];
    features: RepoFeature[];
    functions: RepoFunction[];
    artifacts: RepoArtifact[];
    analysisDocs: AnalysisDoc[];
    connections: McpConnection[];
    epics: RepoEpic[];
    stories: RepoStory[];
}

function emptyStore(): LocalStore {
    return { companies: [], projects: [], features: [], functions: [], artifacts: [], analysisDocs: [], connections: [], epics: [], stories: [] };
}

function load(): LocalStore {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return emptyStore();
        return normalizeStore({ ...emptyStore(), ...JSON.parse(raw) });
    } catch { return emptyStore(); }
}

function save(store: LocalStore) {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
}

const now = () => Date.now();
const uuid = () => crypto.randomUUID();
const DEFAULT_COMPANY_NAME = 'My Projects';

function ensureCompanyForProject(store: LocalStore, project: RepoProject): string {
    const existingId = project.company_id;
    if (existingId && store.companies.some(c => c.id === existingId)) return existingId;

    let fallbackCompany = store.companies.find(c => c.name === DEFAULT_COMPANY_NAME);
    if (!fallbackCompany) {
        fallbackCompany = {
            id: uuid(),
            name: DEFAULT_COMPANY_NAME,
            description: null,
            created_at: now(),
            updated_at: now(),
        };
        store.companies.push(fallbackCompany);
    }
    project.company_id = fallbackCompany.id;
    return fallbackCompany.id;
}

function normalizeStore(store: LocalStore): LocalStore {
    if (store.projects.length > 0 && store.companies.length === 0) {
        store.companies.push({
            id: uuid(),
            name: DEFAULT_COMPANY_NAME,
            description: null,
            created_at: now(),
            updated_at: now(),
        });
    }

    store.projects = store.projects.map(project => {
        const normalized: RepoProject = {
            ...project,
            company_id: (project as Partial<RepoProject>).company_id || '',
        };
        ensureCompanyForProject(store, normalized);
        return normalized;
    });

    return store;
}

function mapCompaniesWithProjects(store: LocalStore): RepoCompany[] {
    const projects = store.projects
        .map(p => ({
            ...p,
            _count: {
                features: store.features.filter(f => f.project_id === p.id).length,
                artifacts: store.artifacts.filter(a => a.project_id === p.id).length,
                connections: store.connections.filter(c => c.project_id === p.id).length,
            },
        }))
        .sort((a, b) => b.updated_at - a.updated_at);
    return store.companies
        .map(company => ({
            ...company,
            projects: projects.filter(project => project.company_id === company.id),
        }))
        .sort((a, b) => b.updated_at - a.updated_at);
}

// ── Companies ───────────────────────────────────────────

export function localGetCompanies(): RepoCompany[] {
    const store = load();
    return mapCompaniesWithProjects(store);
}

export function localGetCompany(id: string): RepoCompany | null {
    const store = load();
    const company = store.companies.find(c => c.id === id);
    if (!company) return null;
    return {
        ...company,
        projects: localGetProjects(id),
    };
}

export function localCreateCompany(data: CreateCompanyInput): RepoCompany {
    const store = load();
    const company: RepoCompany = {
        id: uuid(),
        name: data.name,
        description: data.description || null,
        created_at: now(),
        updated_at: now(),
        projects: [],
    };
    store.companies.push(company);
    save(store);
    return company;
}

export function localUpdateCompany(id: string, data: UpdateCompanyInput): RepoCompany {
    const store = load();
    const idx = store.companies.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Company not found');
    if (data.name !== undefined) store.companies[idx].name = data.name;
    if (data.description !== undefined) store.companies[idx].description = data.description ?? null;
    store.companies[idx].updated_at = now();
    save(store);
    return store.companies[idx];
}

export function localDeleteCompany(id: string): void {
    const store = load();
    const projectIds = store.projects.filter(p => p.company_id === id).map(p => p.id);

    store.companies = store.companies.filter(c => c.id !== id);
    store.projects = store.projects.filter(p => p.company_id !== id);
    store.features = store.features.filter(f => !projectIds.includes(f.project_id));
    store.artifacts = store.artifacts.filter(a => !a.project_id || !projectIds.includes(a.project_id));
    store.analysisDocs = store.analysisDocs.filter(d => !projectIds.includes(d.project_id));
    store.connections = store.connections.filter(c => !projectIds.includes(c.project_id));
    const epicIds = store.epics.filter(e => projectIds.includes(e.project_id)).map(e => e.id);
    store.stories = store.stories.filter(st => !epicIds.includes(st.epic_id));
    store.epics = store.epics.filter(e => !projectIds.includes(e.project_id));
    store.functions = store.functions.filter(fn => {
        const feature = store.features.find(f => f.id === fn.feature_id);
        return Boolean(feature);
    });
    save(store);
}

// ── Projects ────────────────────────────────────────────

export function localGetProjects(companyId?: string): RepoProject[] {
    const s = load();
    return s.projects
        .filter(p => !companyId || p.company_id === companyId)
        .map(p => ({
            ...p,
            _count: {
                features: s.features.filter(f => f.project_id === p.id).length,
                artifacts: s.artifacts.filter(a => a.project_id === p.id).length,
                connections: s.connections.filter(c => c.project_id === p.id).length,
            },
        }))
        .sort((a, b) => b.updated_at - a.updated_at);
}

export function localGetProject(id: string): RepoProject | null {
    const s = load();
    return s.projects.find(p => p.id === id) || null;
}

export function localCreateProject(data: CreateProjectInput): RepoProject {
    const s = load();
    const companyId = data.companyId || data.company_id;
    const resolvedCompanyId = companyId && s.companies.some(c => c.id === companyId)
        ? companyId
        : (() => {
            if (s.companies.length === 0) {
                const defaultCompany: RepoCompany = {
                    id: uuid(),
                    name: DEFAULT_COMPANY_NAME,
                    description: null,
                    created_at: now(),
                    updated_at: now(),
                    projects: [],
                };
                s.companies.push(defaultCompany);
            }
            return s.companies[0].id;
        })();
    const project: RepoProject = {
        id: uuid(), name: data.name, description: data.description || null,
        prd_content: null, epics_content: null, created_at: now(), updated_at: now(),
        company_id: resolvedCompanyId,
        _count: { features: 0, artifacts: 0, connections: 0 },
    };
    s.projects.push(project);
    save(s);
    return project;
}

export function localUpdateProject(id: string, data: UpdateProjectInput): RepoProject {
    const s = load();
    const idx = s.projects.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Project not found');
    const p = s.projects[idx];
    if (data.name !== undefined) p.name = data.name;
    if (data.description !== undefined) p.description = data.description ?? null;
    if (data.prd_content !== undefined) p.prd_content = data.prd_content ?? null;
    if (data.prdContent !== undefined) p.prd_content = data.prdContent ?? null;
    if (data.epics_content !== undefined) p.epics_content = data.epics_content ?? null;
    if (data.epicsContent !== undefined) p.epics_content = data.epicsContent ?? null;
    if (data.company_id !== undefined) p.company_id = data.company_id;
    if (data.companyId !== undefined) p.company_id = data.companyId;
    p.updated_at = now();
    save(s);
    return p;
}

export function localDeleteProject(id: string): void {
    const s = load();
    s.projects = s.projects.filter(p => p.id !== id);
    s.features = s.features.filter(f => f.project_id !== id);
    s.artifacts = s.artifacts.filter(a => a.project_id !== id);
    s.analysisDocs = s.analysisDocs.filter(d => d.project_id !== id);
    s.connections = s.connections.filter(c => c.project_id !== id);
    // Clean up epics/stories for this project
    const epicIds = s.epics.filter(e => e.project_id === id).map(e => e.id);
    s.stories = s.stories.filter(st => !epicIds.includes(st.epic_id));
    s.epics = s.epics.filter(e => e.project_id !== id);
    save(s);
}

// ── Features ────────────────────────────────────────────

export function localGetFeatures(projectId: string): RepoFeature[] {
    const s = load();
    return s.features
        .filter(f => f.project_id === projectId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(f => ({
            ...f,
            functions: s.functions
                .filter(fn => fn.feature_id === f.id)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(fn => ({
                    ...fn,
                    _count: { artifacts: s.artifacts.filter(a => a.function_id === fn.id).length },
                })),
        }));
}

export function localCreateFeature(projectId: string, data: CreateFeatureInput): RepoFeature {
    const s = load();
    const sortOrder = s.features.filter(f => f.project_id === projectId).length;
    const feature: RepoFeature = {
        id: uuid(), name: data.name, description: data.description || null,
        sort_order: sortOrder, project_id: projectId, created_at: now(), updated_at: now(),
    };
    s.features.push(feature);
    const pIdx = s.projects.findIndex(p => p.id === projectId);
    if (pIdx !== -1) s.projects[pIdx].updated_at = now();
    save(s);
    return feature;
}

export function localUpdateFeature(id: string, data: UpdateFeatureInput): RepoFeature {
    const s = load();
    const idx = s.features.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Feature not found');
    if (data.name !== undefined) s.features[idx].name = data.name;
    if (data.description !== undefined) s.features[idx].description = data.description ?? null;
    s.features[idx].updated_at = now();
    save(s);
    return s.features[idx];
}

export function localDeleteFeature(id: string): void {
    const s = load();
    s.functions = s.functions.filter(fn => fn.feature_id !== id);
    s.features = s.features.filter(f => f.id !== id);
    save(s);
}

// ── Functions ───────────────────────────────────────────

export function localCreateFunction(featureId: string, data: CreateFunctionInput): RepoFunction {
    const s = load();
    const sortOrder = s.functions.filter(fn => fn.feature_id === featureId).length;
    const fn: RepoFunction = {
        id: uuid(), name: data.name, description: data.description || null,
        sort_order: sortOrder, feature_id: featureId, created_at: now(), updated_at: now(),
    };
    s.functions.push(fn);
    save(s);
    return fn;
}

export function localUpdateFunction(id: string, data: UpdateFunctionInput): RepoFunction {
    const s = load();
    const idx = s.functions.findIndex(fn => fn.id === id);
    if (idx === -1) throw new Error('Function not found');
    if (data.name !== undefined) s.functions[idx].name = data.name;
    if (data.description !== undefined) s.functions[idx].description = data.description ?? null;
    s.functions[idx].updated_at = now();
    save(s);
    return s.functions[idx];
}

export function localDeleteFunction(id: string): void {
    const s = load();
    s.functions = s.functions.filter(fn => fn.id !== id);
    save(s);
}

// ── Artifacts ───────────────────────────────────────────

export function localGetArtifact(id: string): RepoArtifact | null {
    return load().artifacts.find(a => a.id === id) || null;
}

export function localGetArtifactsByProject(projectId: string): RepoArtifact[] {
    return load().artifacts.filter(a => a.project_id === projectId).sort((a, b) => b.created_at - a.created_at);
}

export function localGetArtifactTree(projectId: string, statusFilter?: string): RepoFeature[] {
    const s = load();
    return s.features
        .filter(f => f.project_id === projectId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(f => ({
            ...f,
            functions: s.functions
                .filter(fn => fn.feature_id === f.id)
                .sort((a, b) => a.sort_order - b.sort_order)
                .map(fn => ({
                    ...fn,
                    artifacts: s.artifacts
                        .filter(a => a.function_id === fn.id && (!statusFilter || a.status === statusFilter))
                        .sort((a, b) => b.created_at - a.created_at),
                })),
        }));
}

export function localCreateArtifact(data: CreateArtifactInput): RepoArtifact {
    const s = load();
    const artifact: RepoArtifact = {
        id: uuid(), type: data.type, title: data.title, content: data.content,
        version: 1, status: 'current', source_hash: data.sourceHash || null,
        function_id: data.functionId || null, project_id: data.projectId || null,
        epic_id: data.epicId || null, story_id: data.storyId || null,
        created_at: now(), updated_at: now(),
    };
    s.artifacts.push(artifact);
    save(s);
    return artifact;
}

export function localUpdateArtifact(id: string, data: UpdateArtifactInput): RepoArtifact {
    const s = load();
    const idx = s.artifacts.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Artifact not found');
    if (data.title !== undefined) s.artifacts[idx].title = data.title;
    if (data.content !== undefined) s.artifacts[idx].content = data.content;
    if (data.status !== undefined) s.artifacts[idx].status = data.status;
    s.artifacts[idx].updated_at = now();
    save(s);
    return s.artifacts[idx];
}

export function localDeleteArtifact(id: string): void {
    const s = load();
    s.artifacts = s.artifacts.filter(a => a.id !== id);
    save(s);
}

export function localArchiveArtifact(id: string): RepoArtifact {
    const s = load();
    const idx = s.artifacts.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Artifact not found');
    s.artifacts[idx].status = s.artifacts[idx].status === 'current' ? 'archived' : 'current';
    s.artifacts[idx].updated_at = now();
    save(s);
    return s.artifacts[idx];
}

// ── Analysis Docs ───────────────────────────────────────

export function localGetAnalysisDocs(projectId: string): AnalysisDoc[] {
    return load().analysisDocs.filter(d => d.project_id === projectId).sort((a, b) => b.updated_at - a.updated_at);
}

export function localCreateAnalysisDoc(projectId: string, data: CreateAnalysisDocInput): AnalysisDoc {
    const s = load();
    const doc: AnalysisDoc = {
        id: uuid(), type: data.type, title: data.title, content: data.content || '',
        status: data.status || 'draft', metadata: null, project_id: projectId,
        created_at: now(), updated_at: now(),
    };
    s.analysisDocs.push(doc);
    save(s);
    return doc;
}

export function localUpdateAnalysisDoc(id: string, data: UpdateAnalysisDocInput): AnalysisDoc {
    const s = load();
    const idx = s.analysisDocs.findIndex(d => d.id === id);
    if (idx === -1) throw new Error('Analysis doc not found');
    if (data.content !== undefined) s.analysisDocs[idx].content = data.content;
    if (data.status !== undefined) s.analysisDocs[idx].status = data.status;
    if (data.metadata !== undefined) s.analysisDocs[idx].metadata = data.metadata ?? null;
    s.analysisDocs[idx].updated_at = now();
    save(s);
    return s.analysisDocs[idx];
}

export function localDeleteAnalysisDoc(id: string): void {
    const s = load();
    s.analysisDocs = s.analysisDocs.filter(d => d.id !== id);
    save(s);
}

// ── MCP Connections ─────────────────────────────────────

export function localGetMcpConnections(projectId: string): McpConnection[] {
    return load().connections.filter(c => c.project_id === projectId).sort((a, b) => b.created_at - a.created_at);
}

export function localCreateMcpConnection(projectId: string, data: CreateMcpConnectionInput): McpConnection {
    const s = load();
    const conn: McpConnection = {
        id: uuid(), name: data.name, type: data.type, config: data.config,
        status: 'disconnected', tool_count: 0, project_id: projectId,
        created_at: now(), updated_at: now(),
    };
    s.connections.push(conn);
    save(s);
    return conn;
}

export function localUpdateMcpConnection(id: string, data: UpdateMcpConnectionInput): McpConnection {
    const s = load();
    const idx = s.connections.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Connection not found');
    if (data.status !== undefined) s.connections[idx].status = data.status;
    if (data.tool_count !== undefined) s.connections[idx].tool_count = data.tool_count;
    if (data.toolCount !== undefined) s.connections[idx].tool_count = data.toolCount;
    if (data.config !== undefined) s.connections[idx].config = data.config;
    s.connections[idx].updated_at = now();
    save(s);
    return s.connections[idx];
}

export function localDeleteMcpConnection(id: string): void {
    const s = load();
    s.connections = s.connections.filter(c => c.id !== id);
    save(s);
}

// ── Epics & Stories ─────────────────────────────────────

export function localGetEpics(projectId: string): RepoEpic[] {
    const s = load();
    return s.epics
        .filter(e => e.project_id === projectId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(e => ({
            ...e,
            stories: s.stories.filter(st => st.epic_id === e.id).sort((a, b) => a.sort_order - b.sort_order),
        }));
}

export function localCreateEpic(projectId: string, data: CreateEpicInput): RepoEpic {
    const s = load();
    const sortOrder = s.epics.filter(e => e.project_id === projectId).length;
    const epic: RepoEpic = {
        id: uuid(), title: data.title, description: data.description || null,
        sort_order: sortOrder, project_id: projectId, created_at: now(),
    };
    s.epics.push(epic);
    const pIdx = s.projects.findIndex(p => p.id === projectId);
    if (pIdx !== -1) s.projects[pIdx].updated_at = now();
    save(s);
    return epic;
}

export function localDeleteEpic(id: string): void {
    const s = load();
    s.stories = s.stories.filter(st => st.epic_id !== id);
    s.epics = s.epics.filter(e => e.id !== id);
    save(s);
}

export function localCreateStory(epicId: string, data: CreateStoryInput): RepoStory {
    const s = load();
    const sortOrder = s.stories.filter(st => st.epic_id === epicId).length;
    const story: RepoStory = {
        id: uuid(), title: data.title, description: data.description || null,
        acceptance_criteria: data.acceptance_criteria || data.acceptanceCriteria || null,
        sort_order: sortOrder, epic_id: epicId, created_at: now(),
    };
    s.stories.push(story);
    save(s);
    return story;
}

export function localDeleteStory(id: string): void {
    const s = load();
    s.stories = s.stories.filter(st => st.id !== id);
    save(s);
}
