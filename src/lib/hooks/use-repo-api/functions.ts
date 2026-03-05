// ── Functions Hooks ─────────────────────────────────────────────────────────
// API-first with localStorage fallback when backend is unavailable.
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
import {
  localCreateFunction,
  localUpdateFunction,
  localDeleteFunction,
} from '../../repo-local-store';

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
      try {
        const functions = await api.get<ApiFunction[]>(`/api/features/${featureId}/functions`);
        return functions.map(mapFunction);
      } catch {
        return [];
      }
    },
    enabled: !!featureId,
  });
}

export function useCreateFunction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFunctionInput & { featureId: string }) => {
      try {
        const created = await api.post<ApiFunction>('/api/functions', data);
        return mapFunction(created);
      } catch {
        return localCreateFunction(data.featureId, data);
      }
    },
    onSuccess: (_fn, variables) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.functions(variables.featureId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useUpdateFunction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFunctionInput }) => {
      try {
        const updated = await api.put<ApiFunction>(`/api/functions/${id}`, data);
        return mapFunction(updated);
      } catch {
        return localUpdateFunction(id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useDeleteFunction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del<{ success: boolean }>(`/api/functions/${id}`);
      } catch {
        localDeleteFunction(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
