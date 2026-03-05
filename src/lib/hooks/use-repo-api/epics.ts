// ── Epics & Stories Hooks ───────────────────────────────────────────────────
// API-first with localStorage fallback when backend is unavailable.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import type {
  ApiEpic,
  ApiStory,
  CreateEpicInput,
  CreateStoryInput,
} from './types';
import {
  localGetEpics,
  localCreateEpic,
  localDeleteEpic,
  localCreateStory,
  localDeleteStory,
} from '../../repo-local-store';

export function useEpics(projectId: string) {
  return useQuery({
    queryKey: repoKeys.epics(projectId),
    queryFn: async () => {
      try {
        return await api.get<ApiEpic[]>(`/api/projects/${projectId}/epics`);
      } catch {
        return localGetEpics(projectId);
      }
    },
    enabled: !!projectId,
  });
}

export function useCreateEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEpicInput & { projectId: string }) => {
      try {
        return await api.post<ApiEpic>('/api/epics', data);
      } catch {
        return localCreateEpic(data.projectId, data);
      }
    },
    onSuccess: (_epic, variables) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.epics(variables.projectId) });
    },
  });
}

export function useDeleteEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del<{ success: boolean }>(`/api/epics/${id}`);
      } catch {
        localDeleteEpic(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateStoryInput & { epicId: string }) => {
      try {
        return await api.post<ApiStory>('/api/stories', data);
      } catch {
        return localCreateStory(data.epicId, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del<{ success: boolean }>(`/api/stories/${id}`);
      } catch {
        localDeleteStory(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
