import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import {
  isoToTimestamp,
  type ApiArtifact,
  type ApiFunction,
  type RepoArtifact,
  type RepoFunction,
  type CreateFunctionInput,
  type UpdateFunctionInput,
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

export function useFunctions(featureId: string) {
  return useQuery({
    queryKey: repoKeys.functions(featureId),
    queryFn: async () => {
      const functions = await api.get<ApiFunction[]>(`/api/features/${featureId}/functions`);
      return functions.map(mapFunction);
    },
    enabled: !!featureId,
  });
}

export function useCreateFunction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateFunctionInput & { featureId: string }) =>
      api.post<ApiFunction>('/api/functions', data),
    onSuccess: (fn) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.functions(fn.featureId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useUpdateFunction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFunctionInput }) =>
      api.put<ApiFunction>(`/api/functions/${id}`, data),
    onSuccess: (fn) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.functions(fn.featureId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useDeleteFunction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/api/functions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
