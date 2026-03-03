---
title: "Phase 3: Data Layer Migration"
description: "Replace SQLite with API calls using React Query for caching, optimistic updates, and offline support"
status: completed
priority: P1
effort: 8h
branch: main
tags: [data-layer, react-query, api-migration, offline-support]
created: 2026-03-03
---

# Phase 3: Data Layer Migration

## Overview

Migrate from local SQLite (`repo-db.ts`) to remote API calls via React Query (TanStack Query). This phase focuses on replacing direct DB calls with API hooks while adding caching, optimistic UI, and offline resilience.

**Goal:** Seamless data layer swap without UX degradation.

## Current State Analysis

### SQLite API (repo-db.ts) - 504 lines
Exports ~30 functions across 8 entities:
- **Projects:** getProjects, getProject, createProject, updateProject, deleteProject
- **Features:** getFeatures, createFeature, updateFeature, deleteFeature
- **Functions:** createFunction, updateFunction, deleteFunction
- **Artifacts:** getArtifact, createArtifact, updateArtifact, deleteArtifact, archiveArtifact, getArtifactTree, getArtifactsByProject
- **Analysis Docs:** getAnalysisDocs, createAnalysisDoc, updateAnalysisDoc, deleteAnalysisDoc
- **MCP Connections:** getMcpConnections, createMcpConnection, updateMcpConnection, deleteMcpConnection
- **Epics/Stories:** getEpics, createEpic, deleteEpic, createStory, deleteStory
- **Utility:** exportProject

### Consumers (12 files)
| File | Functions Used |
|------|----------------|
| Repo.tsx | getProjects, createProject, deleteProject |
| ProjectDetail.tsx | getProject, updateProject, getFeatures |
| FeatureTree.tsx | createFeature, updateFeature, deleteFeature, createFunction, updateFunction, deleteFunction |
| ArtifactsTable.tsx | getArtifactsByProject |
| ArtifactPanel.tsx | getArtifact, updateArtifact |
| AnalysisTab.tsx | getAnalysisDocs, createAnalysisDoc, updateAnalysisDoc, deleteAnalysisDoc |
| ConnectionsTab.tsx | getMcpConnections, createMcpConnection, updateMcpConnection, deleteMcpConnection |
| PrdChat.tsx | updateProject |
| GenerateArtifactsModal.tsx | createArtifact, createFeature, createFunction |
| GenerateModal.tsx | createArtifact |
| artifact-orchestrator.ts | createArtifact |
| orchestrator.ts | createArtifact |

### API Client (api-client.ts)
Already has generic CRUD methods:
- `get<T>(endpoint)` → GET
- `post<T>(endpoint, data)` → POST
- `put<T>(endpoint, data)` → PUT
- `del<T>(endpoint)` → DELETE

## Phase Structure

### Task #22: Set up React Query Provider (1h)

**Files:**
- `src/lib/query-client.ts` (new)
- `src/App.tsx` (modify)

**Steps:**
1. Install TanStack Query: `npm install @tanstack/react-query`
2. Create QueryClient with sensible defaults:
   - staleTime: 30s (avoid excessive refetches)
   - gcTime: 5min
   - retry: 2 (with exponential backoff)
   - refetchOnWindowFocus: false
3. Wrap App with QueryClientProvider
4. Add DevTools in dev mode

---

### Task #20: Create React Query Hooks (3h)

**File:** `src/lib/hooks/use-repo-api.ts` (new, split into modules if >200 lines)

**Hook Structure:**
```
use-repo-api/
  index.ts          # Re-exports
  projects.ts       # useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject
  features.ts       # useFeatures, useCreateFeature, useUpdateFeature, useDeleteFeature
  functions.ts      # useFunctions, useCreateFunction, useUpdateFunction, useDeleteFunction
  artifacts.ts      # useArtifact, useArtifactsByProject, useCreateArtifact, useUpdateArtifact, useDeleteArtifact
  analysis.ts       # useAnalysisDocs, useCreateAnalysisDoc, useUpdateAnalysisDoc, useDeleteAnalysisDoc
  connections.ts    # useMcpConnections, useCreateMcpConnection, useUpdateMcpConnection, useDeleteMcpConnection
  types.ts          # API response types (may differ from SQLite types)
  utils.ts          # Query key factory, optimistic helpers
```

**Query Key Factory:**
```ts
export const repoKeys = {
  all: ['repo'] as const,
  projects: () => [...repoKeys.all, 'projects'] as const,
  project: (id: string) => [...repoKeys.all, 'project', id] as const,
  features: (projectId: string) => [...repoKeys.all, 'features', projectId] as const,
  artifact: (id: string) => [...repoKeys.all, 'artifact', id] as const,
  artifactsByProject: (projectId: string) => [...repoKeys.all, 'artifacts', projectId] as const,
  analysisDocs: (projectId: string) => [...repoKeys.all, 'analysis', projectId] as const,
  connections: (projectId: string) => [...repoKeys.all, 'connections', projectId] as const,
};
```

**Example Hook (Projects):**
```ts
export function useProjects() {
  return useQuery({
    queryKey: repoKeys.projects(),
    queryFn: () => api.get<ApiProject[]>('/api/projects'),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<ApiProject>('/api/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
    },
  });
}
```

**Optimistic Update Pattern:**
```ts
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      api.put<ApiProject>(`/api/projects/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: repoKeys.project(id) });
      const previous = queryClient.getQueryData(repoKeys.project(id));
      queryClient.setQueryData(repoKeys.project(id), (old: ApiProject | undefined) =>
        old ? { ...old, ...data } : undefined
      );
      return { previous };
    },
    onError: (_err, { id }, context) => {
      queryClient.setQueryData(repoKeys.project(id), context?.previous);
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.project(id) });
    },
  });
}
```

---

### Task #21: Migrate Components (3h)

**Migration Strategy:**
1. Import hooks from `use-repo-api` instead of direct DB calls
2. Replace `useState` + `useEffect` with React Query hooks
3. Replace async handlers with mutation hooks
4. Handle loading/error states via hook returns

**File-by-File Changes:**

| File | Changes |
|------|---------|
| `Repo.tsx` | useProjects, useCreateProject, useDeleteProject |
| `ProjectDetail.tsx` | useProject, useUpdateProject, useFeatures |
| `FeatureTree.tsx` | useCreateFeature, useUpdateFeature, useDeleteFeature, useCreateFunction, useUpdateFunction, useDeleteFunction |
| `ArtifactsTable.tsx` | useArtifactsByProject |
| `ArtifactPanel.tsx` | useArtifact, useUpdateArtifact |
| `AnalysisTab.tsx` | useAnalysisDocs, useCreateAnalysisDoc, useUpdateAnalysisDoc, useDeleteAnalysisDoc |
| `ConnectionsTab.tsx` | useMcpConnections, useCreateMcpConnection, useUpdateMcpConnection, useDeleteMcpConnection |
| `PrdChat.tsx` | useUpdateProject |
| `GenerateArtifactsModal.tsx` | useCreateArtifact, useCreateFeature, useCreateFunction |
| `GenerateModal.tsx` | useCreateArtifact |
| `artifact-orchestrator.ts` | Direct API call (not hook, outside React) |
| `orchestrator.ts` | Direct API call (not hook, outside React) |

**Component Migration Example (Repo.tsx):**
```tsx
// Before
const [projects, setProjects] = useState<RepoProject[]>([]);
const [loading, setLoading] = useState(true);
useEffect(() => { loadProjects(); }, []);
const loadProjects = async () => {
  const data = await getProjects();
  setProjects(data);
  setLoading(false);
};

// After
const { data: projects = [], isLoading, error } = useProjects();
const createProject = useCreateProject();
const deleteProject = useDeleteProject();
```

---

### Task #23: Error Boundaries & Offline (1h)

**Files:**
- `src/lib/error-boundary.tsx` (new)
- `src/lib/offline-queue.ts` (new)
- `src/App.tsx` (modify)

**Error Boundary:**
```tsx
export class RepoErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

**Offline Queue:**
- Store failed mutations in localStorage
- Retry on reconnect (via `window.addEventListener('online', ...)`)
- Use React Query's `useMutation` with `mutationCache` for persistence

**Implementation:**
1. Create ErrorBoundary component with retry UI
2. Wrap repo-related routes with ErrorBoundary
3. Add offline detection hook: `useOnlineStatus()`
4. Queue failed mutations with exponential backoff

---

## API Type Mapping

Backend API types may differ slightly from SQLite types. Create mapping layer in `types.ts`:

| SQLite Field | API Field | Transform |
|--------------|-----------|-----------|
| `created_at` (number) | `createdAt` (ISO string) | `new Date(x).getTime()` |
| `updated_at` (number) | `updatedAt` (ISO string) | `new Date(x).getTime()` |
| `prd_content` | `prdContent` | direct |
| `project_id` | `projectId` | direct |
| `function_id` | `functionId` | direct |

---

## Success Criteria

- [ ] All 12 consumer files migrated to React Query hooks
- [ ] No direct SQLite imports in components
- [ ] Loading states show skeleton/spinner
- [ ] Errors show toast/alert with retry option
- [ ] Offline mutations queued and retried
- [ ] Optimistic updates feel instant
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API types mismatch SQLite | Medium | Medium | Create mapping layer in types.ts |
| Offline UX degradation | Medium | High | Queue + optimistic updates |
| Breaking existing flows | Low | High | Incremental migration, test each file |
| Performance regression | Low | Medium | React Query caching, monitor |

---

## Dependencies

- **Backend API:** Must be running and accessible
- **Phase 2:** API client (api-client.ts) already complete
- **npm package:** @tanstack/react-query (to install)

---

## Next Steps (After Phase 3)

1. **Phase 4:** Remove SQLite dependency entirely
2. **Phase 5:** Add real-time subscriptions (WebSocket/SSE)
3. **Phase 6:** Performance optimization (prefetching, pagination)

---

## Unresolved Questions

1. Should we keep SQLite as offline cache? (recommend: no, adds complexity)
2. Should error toasts auto-dismiss? (recommend: yes, 5s timeout)
3. Do we need request deduplication? (React Query handles this)
