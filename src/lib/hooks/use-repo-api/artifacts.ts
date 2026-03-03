import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import type {
  ApiFeature,
  ApiArtifact,
  RepoFeature,
  RepoArtifact,
  CreateArtifactInput,
  UpdateArtifactInput,
} from './types';
import { isoToTimestamp } from './types';

function mapArtifact(artifact: ApiArtifact): RepoArtifact {
  return {
    ...artifact,
    source_hash: artifact.sourceHash,
    function_id: artifact.functionId,
    project_id: artifact.projectId,
    epic_id: artifact.epicId,
    story_id: artifact.storyId,
    created_at: isoToTimestamp(artifact.createdAt),
    updated_at: isoToTimestamp(artifact.updatedAt),
  };
}

function mapFeature(feature: ApiFeature): RepoFeature {
  return {
    ...feature,
    sort_order: feature.sortOrder,
    project_id: feature.projectId,
    created_at: isoToTimestamp(feature.createdAt),
    updated_at: isoToTimestamp(feature.updatedAt),
    functions: (feature.functions ?? []).map((fn) => ({
      ...fn,
      sort_order: fn.sortOrder,
      feature_id: fn.featureId,
      created_at: isoToTimestamp(fn.createdAt),
      updated_at: isoToTimestamp(fn.updatedAt),
      artifacts: fn.artifacts?.map(mapArtifact),
    })),
  };
}

function buildArtifactTree(
  features: ApiFeature[],
  artifacts: ApiArtifact[],
  statusFilter?: string
): RepoFeature[] {
  const normalizedFilter = statusFilter?.toLowerCase();
  const filteredArtifacts = normalizedFilter
    ? artifacts.filter((artifact) => artifact.status.toLowerCase() === normalizedFilter)
    : artifacts;

  return features.map((feature) => {
    const mapped = mapFeature(feature);
    return {
      ...mapped,
      functions: (mapped.functions ?? []).map((fn) => ({
        ...fn,
        artifacts: filteredArtifacts
          .filter((artifact) => artifact.functionId === fn.id)
          .map(mapArtifact),
      })),
    };
  });
}

export function useArtifact(id: string) {
  return useQuery({
    queryKey: repoKeys.artifact(id),
    queryFn: async () => {
      const artifact = await api.get<ApiArtifact>(`/api/artifacts/${id}`);
      return mapArtifact(artifact);
    },
    enabled: !!id,
  });
}

export function useArtifactsByProject(projectId: string) {
  return useQuery({
    queryKey: repoKeys.artifactsByProject(projectId),
    queryFn: async () => {
      const artifacts = await api.get<ApiArtifact[]>(`/api/projects/${projectId}/artifacts`);
      return artifacts.map(mapArtifact);
    },
    enabled: !!projectId,
  });
}

export function useArtifactTree(projectId: string, statusFilter?: string) {
  return useQuery({
    queryKey: repoKeys.artifactTree(projectId, statusFilter),
    queryFn: async () => {
      const [features, artifacts] = await Promise.all([
        api.get<ApiFeature[]>(`/api/projects/${projectId}/features`),
        api.get<ApiArtifact[]>(`/api/projects/${projectId}/artifacts`),
      ]);
      return buildArtifactTree(features, artifacts, statusFilter);
    },
    enabled: !!projectId,
  });
}

export function useCreateArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateArtifactInput) => api.post<ApiArtifact>('/api/artifacts', data),
    onSuccess: (artifact) => {
      if (!artifact.projectId) {
        queryClient.invalidateQueries({ queryKey: repoKeys.all });
        return;
      }
      queryClient.invalidateQueries({ queryKey: repoKeys.artifactsByProject(artifact.projectId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.artifactTree(artifact.projectId) });
      if (artifact.functionId) {
        queryClient.invalidateQueries({ queryKey: repoKeys.functions(artifact.functionId) });
      }
    },
  });
}

export function useUpdateArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateArtifactInput }) =>
      api.put<ApiArtifact>(`/api/artifacts/${id}`, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: repoKeys.artifact(id) });
      const previous = queryClient.getQueryData<RepoArtifact>(repoKeys.artifact(id));
      queryClient.setQueryData<RepoArtifact>(repoKeys.artifact(id), (old) =>
        old ? { ...old, ...data } : undefined
      );
      return { previous };
    },
    onError: (_error, { id }, context) => {
      queryClient.setQueryData(repoKeys.artifact(id), context?.previous);
    },
    onSuccess: (artifact) => {
      if (artifact.projectId) {
        queryClient.invalidateQueries({ queryKey: repoKeys.artifactsByProject(artifact.projectId) });
        queryClient.invalidateQueries({ queryKey: repoKeys.artifactTree(artifact.projectId) });
      }
      queryClient.setQueryData(repoKeys.artifact(artifact.id), mapArtifact(artifact));
    },
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.artifact(id) });
    },
  });
}

export function useDeleteArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/api/artifacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useArchiveArtifact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const artifact = await api.get<ApiArtifact>(`/api/artifacts/${id}`);
      const nextStatus = artifact.status.toLowerCase() === 'current' ? 'ARCHIVED' : 'CURRENT';
      return api.put<ApiArtifact>(`/api/artifacts/${id}`, { status: nextStatus });
    },
    onSuccess: (artifact) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.artifact(artifact.id) });
      if (artifact.projectId) {
        queryClient.invalidateQueries({ queryKey: repoKeys.artifactsByProject(artifact.projectId) });
        queryClient.invalidateQueries({ queryKey: repoKeys.artifactTree(artifact.projectId) });
      }
    },
  });
}
