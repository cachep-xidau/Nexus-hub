// ── Projects Hooks ──────────────────────────────────────────────────────────
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import {
  isoToTimestamp,
  type ApiProject,
  type RepoProject,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './types';

function mapProject(project: ApiProject): RepoProject {
  return {
    ...project,
    prd_content: project.prdContent,
    created_at: isoToTimestamp(project.createdAt),
    updated_at: isoToTimestamp(project.updatedAt),
  };
}

function toApiProjectUpdate(data: UpdateProjectInput) {
  const { prd_content, prdContent, ...rest } = data;
  return {
    ...rest,
    ...(prdContent !== undefined
      ? { prdContent }
      : prd_content !== undefined
        ? { prdContent: prd_content }
        : {}),
  };
}

// GET /api/projects
export function useProjects() {
  return useQuery({
    queryKey: repoKeys.projects(),
    queryFn: async () => {
      const projects = await api.get<ApiProject[]>('/api/projects');
      return projects.map(mapProject);
    },
  });
}

// GET /api/projects/:id
export function useProject(id: string) {
  return useQuery({
    queryKey: repoKeys.project(id),
    queryFn: async () => {
      const project = await api.get<ApiProject>(`/api/projects/${id}`);
      return mapProject(project);
    },
    enabled: !!id,
  });
}

// POST /api/projects
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      api.post<ApiProject>('/api/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
    },
  });
}

// PUT /api/projects/:id
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      api.put<ApiProject>(`/api/projects/${id}`, toApiProjectUpdate(data)),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: repoKeys.project(id) });
      const previous = queryClient.getQueryData<RepoProject>(repoKeys.project(id));
      queryClient.setQueryData<RepoProject>(repoKeys.project(id), (old) =>
        old
          ? {
              ...old,
              ...data,
              ...(data.prd_content !== undefined ? { prd_content: data.prd_content } : {}),
            }
          : undefined
      );
      return { previous };
    },
    onError: (_err, { id }, context) => {
      queryClient.setQueryData(repoKeys.project(id), context?.previous);
    },
    onSuccess: (project) => {
      queryClient.setQueryData(repoKeys.project(project.id), mapProject(project));
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
    },
  });
}

// DELETE /api/projects/:id
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
    },
  });
}
