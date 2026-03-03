import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import {
  isoToTimestamp,
  type ApiArtifact,
  type ApiFeature,
  type ApiFunction,
  type RepoArtifact,
  type RepoFeature,
  type RepoFunction,
  type CreateFeatureInput,
  type UpdateFeatureInput,
} from './types';

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

function mapFunction(fn: ApiFunction): RepoFunction {
  return {
    ...fn,
    sort_order: fn.sortOrder,
    feature_id: fn.featureId,
    created_at: isoToTimestamp(fn.createdAt),
    updated_at: isoToTimestamp(fn.updatedAt),
    artifacts: fn.artifacts?.map(mapArtifact),
  };
}

function mapFeature(feature: ApiFeature): RepoFeature {
  return {
    ...feature,
    sort_order: feature.sortOrder,
    project_id: feature.projectId,
    created_at: isoToTimestamp(feature.createdAt),
    updated_at: isoToTimestamp(feature.updatedAt),
    functions: feature.functions?.map(mapFunction),
  };
}

export function useFeatures(projectId: string) {
  return useQuery({
    queryKey: repoKeys.features(projectId),
    queryFn: async () => {
      const features = await api.get<ApiFeature[]>(`/api/projects/${projectId}/features`);
      return features.map(mapFeature);
    },
    enabled: !!projectId,
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFeatureInput & { projectId: string }) =>
      api.post<ApiFeature>('/api/features', data),
    onSuccess: (feature) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.features(feature.projectId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.project(feature.projectId) });
    },
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFeatureInput }) =>
      api.put<ApiFeature>(`/api/features/${id}`, data),
    onSuccess: (feature) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.features(feature.projectId) });
    },
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/api/features/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
