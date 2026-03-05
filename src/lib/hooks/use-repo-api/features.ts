// ── Features Hooks ──────────────────────────────────────────────────────────
// API-first with localStorage fallback when backend is unavailable.
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
import {
  localGetFeatures,
  localCreateFeature,
  localUpdateFeature,
  localDeleteFeature,
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
      try {
        const features = await api.get<ApiFeature[]>(`/api/projects/${projectId}/features`);
        return features.map(mapFeature);
      } catch {
        return localGetFeatures(projectId);
      }
    },
    enabled: !!projectId,
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateFeatureInput & { projectId: string }) => {
      try {
        const created = await api.post<ApiFeature>('/api/features', data);
        return mapFeature(created);
      } catch {
        return localCreateFeature(data.projectId, data);
      }
    },
    onSuccess: (_feature, variables) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.features(variables.projectId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.project(variables.projectId) });
    },
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateFeatureInput }) => {
      try {
        const updated = await api.put<ApiFeature>(`/api/features/${id}`, data);
        return mapFeature(updated);
      } catch {
        return localUpdateFeature(id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del<{ success: boolean }>(`/api/features/${id}`);
      } catch {
        localDeleteFeature(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
