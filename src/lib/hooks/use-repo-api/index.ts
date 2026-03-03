// ── React Query Hooks for Repo API ───────────────────────────────────────
// Re-exports all hooks from modular files

export { useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject } from './projects';
export { useFeatures, useCreateFeature, useUpdateFeature, useDeleteFeature } from './features';
export { useFunctions, useCreateFunction, useUpdateFunction, useDeleteFunction } from './functions';
export {
  useArtifact,
  useArtifactsByProject,
  useArtifactTree,
  useCreateArtifact,
  useUpdateArtifact,
  useDeleteArtifact,
  useArchiveArtifact,
} from './artifacts';
export {
  useAnalysisDocs,
  useCreateAnalysisDoc,
  useUpdateAnalysisDoc,
  useDeleteAnalysisDoc,
} from './analysis';
export {
  useMcpConnections,
  useCreateMcpConnection,
  useUpdateMcpConnection,
  useDeleteMcpConnection,
} from './connections';
export {
  useEpics,
  useCreateEpic,
  useDeleteEpic,
  useCreateStory,
  useDeleteStory,
} from './epics';
export { repoKeys } from './keys';
export {
  type ApiProject,
  type RepoProject,
  type ApiFeature,
  type RepoFeature,
  type ApiFunction,
  type RepoFunction,
  type ApiArtifact,
  type RepoArtifact,
  type AnalysisDoc,
  type McpConnection,
  type ApiEpic,
  type RepoEpic,
  type ApiStory,
  type RepoStory,
} from './types';
