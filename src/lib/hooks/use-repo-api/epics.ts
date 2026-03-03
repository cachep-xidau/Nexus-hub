import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import type {
  ApiEpic,
  ApiStory,
  CreateEpicInput,
  CreateStoryInput,
} from './types';

export function useEpics(projectId: string) {
  return useQuery({
    queryKey: repoKeys.epics(projectId),
    queryFn: () => api.get<ApiEpic[]>(`/api/projects/${projectId}/epics`),
    enabled: !!projectId,
  });
}

export function useCreateEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEpicInput & { projectId: string }) =>
      api.post<ApiEpic>('/api/epics', data),
    onSuccess: (epic) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.epics(epic.projectId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.epic(epic.id) });
    },
  });
}

export function useDeleteEpic() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/api/epics/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStoryInput & { epicId: string }) =>
      api.post<ApiStory>('/api/stories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/api/stories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
