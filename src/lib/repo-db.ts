import { getDb } from './db';

// ── Types ───────────────────────────────────────────
export interface RepoProject {
    id: string;
    name: string;
    description: string | null;
    prd_content: string | null;
    created_at: number;
    updated_at: number;
    _count?: { features: number; artifacts: number; connections: number };
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
    stories?: RepoArtifact[];
    storyArtifacts?: RepoArtifact[];
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

// ── Projects ────────────────────────────────────────
export async function getProjects(): Promise<RepoProject[]> {
    const d = await getDb();
    const projects = await d.select<RepoProject[]>(
        'SELECT * FROM repo_projects ORDER BY updated_at DESC'
    );

    // Enrich with counts
    for (const p of projects) {
        const [fc] = await d.select<[{ c: number }]>(
            'SELECT COUNT(*) as c FROM repo_features WHERE project_id = ?', [p.id]
        );
        const [ac] = await d.select<[{ c: number }]>(
            'SELECT COUNT(*) as c FROM repo_artifacts WHERE project_id = ?', [p.id]
        );
        const [cc] = await d.select<[{ c: number }]>(
            'SELECT COUNT(*) as c FROM repo_mcp_connections WHERE project_id = ?', [p.id]
        );
        p._count = { features: fc.c, artifacts: ac.c, connections: cc.c };
    }
    return projects;
}

export async function getProject(id: string): Promise<RepoProject | null> {
    const d = await getDb();
    const rows = await d.select<RepoProject[]>(
        'SELECT * FROM repo_projects WHERE id = ?', [id]
    );
    return rows[0] || null;
}

export async function createProject(name: string, description?: string): Promise<string> {
    const d = await getDb();
    const id = crypto.randomUUID();
    const now = Date.now();
    await d.execute(
        'INSERT INTO repo_projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [id, name, description || null, now, now]
    );
    return id;
}

export async function updateProject(id: string, data: { name?: string; description?: string; prd_content?: string }): Promise<void> {
    const d = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
    if (data.prd_content !== undefined) { sets.push('prd_content = ?'); vals.push(data.prd_content); }
    sets.push('updated_at = ?'); vals.push(Date.now());
    vals.push(id);
    await d.execute(`UPDATE repo_projects SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteProject(id: string): Promise<void> {
    const d = await getDb();
    await d.execute('DELETE FROM repo_projects WHERE id = ?', [id]);
}

// ── Features ────────────────────────────────────────
export async function getFeatures(projectId: string): Promise<RepoFeature[]> {
    const d = await getDb();
    const features = await d.select<RepoFeature[]>(
        'SELECT * FROM repo_features WHERE project_id = ? ORDER BY sort_order', [projectId]
    );

    for (const f of features) {
        f.functions = await d.select<RepoFunction[]>(
            'SELECT * FROM repo_functions WHERE feature_id = ? ORDER BY sort_order', [f.id]
        );
        for (const fn of f.functions) {
            const [cnt] = await d.select<[{ c: number }]>(
                'SELECT COUNT(*) as c FROM repo_artifacts WHERE function_id = ?', [fn.id]
            );
            fn._count = { artifacts: cnt.c };
        }
    }
    return features;
}

export async function createFeature(projectId: string, name: string, description?: string): Promise<string> {
    const d = await getDb();
    const id = crypto.randomUUID();
    const now = Date.now();
    const [cnt] = await d.select<[{ c: number }]>(
        'SELECT COUNT(*) as c FROM repo_features WHERE project_id = ?', [projectId]
    );
    await d.execute(
        'INSERT INTO repo_features (id, name, description, sort_order, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, description || null, cnt.c, projectId, now, now]
    );
    await touchProject(projectId);
    return id;
}

export async function updateFeature(id: string, data: { name?: string; description?: string }): Promise<void> {
    const d = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
    sets.push('updated_at = ?'); vals.push(Date.now());
    vals.push(id);
    await d.execute(`UPDATE repo_features SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteFeature(id: string): Promise<void> {
    const d = await getDb();
    await d.execute('DELETE FROM repo_features WHERE id = ?', [id]);
}

// ── Functions ───────────────────────────────────────
export async function createFunction(featureId: string, name: string, description?: string): Promise<string> {
    const d = await getDb();
    const id = crypto.randomUUID();
    const now = Date.now();
    const [cnt] = await d.select<[{ c: number }]>(
        'SELECT COUNT(*) as c FROM repo_functions WHERE feature_id = ?', [featureId]
    );
    await d.execute(
        'INSERT INTO repo_functions (id, name, description, sort_order, feature_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, description || null, cnt.c, featureId, now, now]
    );
    return id;
}

export async function updateFunction(id: string, data: { name?: string; description?: string }): Promise<void> {
    const d = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.name !== undefined) { sets.push('name = ?'); vals.push(data.name); }
    if (data.description !== undefined) { sets.push('description = ?'); vals.push(data.description); }
    sets.push('updated_at = ?'); vals.push(Date.now());
    vals.push(id);
    await d.execute(`UPDATE repo_functions SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteFunction(id: string): Promise<void> {
    const d = await getDb();
    await d.execute('DELETE FROM repo_functions WHERE id = ?', [id]);
}

// ── Artifacts ───────────────────────────────────────
export async function getArtifact(id: string): Promise<RepoArtifact | null> {
    const d = await getDb();
    const rows = await d.select<RepoArtifact[]>(
        'SELECT * FROM repo_artifacts WHERE id = ?', [id]
    );
    return rows[0] || null;
}

export async function createArtifact(data: {
    type: string; title: string; content: string;
    functionId?: string; projectId?: string; epicId?: string; storyId?: string;
    sourceHash?: string;
}): Promise<string> {
    const d = await getDb();
    const id = crypto.randomUUID();
    await d.execute(
        `INSERT INTO repo_artifacts (id, type, title, content, function_id, project_id, epic_id, story_id, source_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.type, data.title, data.content, data.functionId || null, data.projectId || null,
            data.epicId || null, data.storyId || null, data.sourceHash || null, Date.now()]
    );
    return id;
}

export async function updateArtifact(id: string, data: { title?: string; content?: string; status?: string }): Promise<void> {
    const d = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.title !== undefined) { sets.push('title = ?'); vals.push(data.title); }
    if (data.content !== undefined) { sets.push('content = ?'); vals.push(data.content); }
    if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
    vals.push(id);
    if (sets.length > 0) {
        await d.execute(`UPDATE repo_artifacts SET ${sets.join(', ')} WHERE id = ?`, vals);
    }
}

export async function archiveArtifact(id: string): Promise<void> {
    const d = await getDb();
    const art = await getArtifact(id);
    if (!art) return;
    const newStatus = art.status === 'current' ? 'archived' : 'current';
    await d.execute('UPDATE repo_artifacts SET status = ? WHERE id = ?', [newStatus, id]);
}

export async function deleteArtifact(id: string): Promise<void> {
    const d = await getDb();
    await d.execute('DELETE FROM repo_artifacts WHERE id = ?', [id]);
}

export async function getArtifactTree(projectId: string, statusFilter?: string): Promise<RepoFeature[]> {
    const d = await getDb();
    const features = await d.select<RepoFeature[]>(
        'SELECT * FROM repo_features WHERE project_id = ? ORDER BY sort_order', [projectId]
    );

    for (const f of features) {
        f.functions = await d.select<RepoFunction[]>(
            'SELECT * FROM repo_functions WHERE feature_id = ? ORDER BY sort_order', [f.id]
        );
        for (const fn of f.functions) {
            const where = statusFilter ? 'function_id = ? AND status = ?' : 'function_id = ?';
            const params = statusFilter ? [fn.id, statusFilter] : [fn.id];
            fn.artifacts = await d.select<RepoArtifact[]>(
                `SELECT * FROM repo_artifacts WHERE ${where} ORDER BY created_at DESC`, params
            );
        }
    }
    return features;
}

// ── Analysis Documents ──────────────────────────────
export async function getAnalysisDocs(projectId: string): Promise<AnalysisDoc[]> {
    const d = await getDb();
    return d.select<AnalysisDoc[]>(
        'SELECT * FROM repo_analysis_docs WHERE project_id = ? ORDER BY updated_at DESC', [projectId]
    );
}

export async function createAnalysisDoc(projectId: string, data: {
    type: string; title: string; content?: string; status?: string;
}): Promise<string> {
    const d = await getDb();
    const id = crypto.randomUUID();
    const now = Date.now();
    await d.execute(
        'INSERT INTO repo_analysis_docs (id, type, title, content, status, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, data.type, data.title, data.content || '', data.status || 'draft', projectId, now, now]
    );
    return id;
}

export async function updateAnalysisDoc(id: string, data: { content?: string; status?: string; metadata?: string }): Promise<void> {
    const d = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.content !== undefined) { sets.push('content = ?'); vals.push(data.content); }
    if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
    if (data.metadata !== undefined) { sets.push('metadata = ?'); vals.push(data.metadata); }
    sets.push('updated_at = ?'); vals.push(Date.now());
    vals.push(id);
    await d.execute(`UPDATE repo_analysis_docs SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteAnalysisDoc(id: string): Promise<void> {
    const d = await getDb();
    await d.execute('DELETE FROM repo_analysis_docs WHERE id = ?', [id]);
}

// ── MCP Connections ─────────────────────────────────
export async function getMcpConnections(projectId: string): Promise<McpConnection[]> {
    const d = await getDb();
    return d.select<McpConnection[]>(
        'SELECT * FROM repo_mcp_connections WHERE project_id = ? ORDER BY created_at DESC', [projectId]
    );
}

export async function createMcpConnection(projectId: string, name: string, type: string, config: string): Promise<string> {
    const d = await getDb();
    const id = crypto.randomUUID();
    const now = Date.now();
    await d.execute(
        'INSERT INTO repo_mcp_connections (id, name, type, config, project_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name, type, config, projectId, now, now]
    );
    return id;
}

export async function updateMcpConnection(id: string, data: { status?: string; tool_count?: number; config?: string }): Promise<void> {
    const d = await getDb();
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
    if (data.tool_count !== undefined) { sets.push('tool_count = ?'); vals.push(data.tool_count); }
    if (data.config !== undefined) { sets.push('config = ?'); vals.push(data.config); }
    sets.push('updated_at = ?'); vals.push(Date.now());
    vals.push(id);
    await d.execute(`UPDATE repo_mcp_connections SET ${sets.join(', ')} WHERE id = ?`, vals);
}

export async function deleteMcpConnection(id: string): Promise<void> {
    const d = await getDb();
    await d.execute('DELETE FROM repo_mcp_connections WHERE id = ?', [id]);
}

// ── Helpers ─────────────────────────────────────────
async function touchProject(projectId: string): Promise<void> {
    const d = await getDb();
    await d.execute('UPDATE repo_projects SET updated_at = ? WHERE id = ?', [Date.now(), projectId]);
}

// ── Export project as JSON bundle ────────────────────
export async function exportProject(projectId: string) {
    const project = await getProject(projectId);
    if (!project) return null;

    const tree = await getArtifactTree(projectId, 'current');
    const analysisDocs = await getAnalysisDocs(projectId);
    const connections = await getMcpConnections(projectId);

    return {
        project: { name: project.name, description: project.description, prdContent: project.prd_content },
        features: tree.map(f => ({
            name: f.name,
            functions: (f.functions || []).map(fn => ({
                name: fn.name,
                artifacts: (fn.artifacts || []).map(a => ({
                    type: a.type, title: a.title, content: a.content, version: a.version,
                })),
            })),
        })),
        analysisDocs: analysisDocs.map(d => ({ type: d.type, title: d.title, content: d.content })),
        connections: connections.map(c => ({ name: c.name, type: c.type, status: c.status })),
    };
}
