// ── Projects Hooks ──────────────────────────────────────────────────────────
// API-first with localStorage fallback when backend is unavailable.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import { normalizeProjectCompanyId } from '../../repo-company-fallback';
import {
  isoToTimestamp,
  type ApiProject,
  type RepoProject,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './types';
import {
  localGetProjects,
  localGetProject,
  localCreateProject,
  localUpdateProject,
  localDeleteProject,
} from '../../repo-local-store';

function mapProject(project: ApiProject): RepoProject {
  const companyId = normalizeProjectCompanyId(project.companyId);
  return {
    ...project,
    prd_content: project.prdContent,
    epics_content: project.epicsContent ?? null,
    company_id: companyId,
    created_at: isoToTimestamp(project.createdAt),
    updated_at: isoToTimestamp(project.updatedAt),
  };
}

function toApiProjectUpdate(data: UpdateProjectInput) {
  const { prd_content, prdContent, epics_content, epicsContent, company_id, companyId, ...rest } = data;
  return {
    ...rest,
    ...(prdContent !== undefined
      ? { prdContent }
      : prd_content !== undefined
        ? { prdContent: prd_content }
        : {}),
    ...(epicsContent !== undefined
      ? { epicsContent }
      : epics_content !== undefined
        ? { epicsContent: epics_content }
        : {}),
    ...(companyId !== undefined
      ? { companyId }
      : company_id !== undefined
        ? { companyId: company_id }
        : {}),
  };
}

// GET /api/projects — falls back to localStorage
export function useProjects(companyId?: string) {
  return useQuery({
    queryKey: companyId ? repoKeys.projectsByCompany(companyId) : repoKeys.projects(),
    queryFn: async () => {
      try {
        const endpoint = companyId ? `/api/projects?companyId=${encodeURIComponent(companyId)}` : '/api/projects';
        const projects = await api.get<ApiProject[]>(endpoint);
        return projects.map(mapProject);
      } catch {
        return localGetProjects(companyId);
      }
    },
  });
}

// GET /api/projects/:id — falls back to localStorage
export function useProject(id: string) {
  return useQuery({
    queryKey: repoKeys.project(id),
    queryFn: async () => {
      try {
        const project = await api.get<ApiProject>(`/api/projects/${id}`);
        return mapProject(project);
      } catch {
        const local = localGetProject(id);
        if (!local) throw new Error('Project not found');
        return local;
      }
    },
    enabled: !!id,
  });
}

// POST /api/projects — falls back to localStorage
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const payload = {
        ...data,
        companyId: data.companyId ?? data.company_id,
      };
      try {
        const created = await api.post<ApiProject>('/api/projects', payload);
        return mapProject(created);
      } catch {
        return localCreateProject(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
      queryClient.invalidateQueries({ queryKey: repoKeys.companies() });
    },
  });
}

// PUT /api/projects/:id — falls back to localStorage
export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProjectInput }) => {
      try {
        const updated = await api.put<ApiProject>(`/api/projects/${id}`, toApiProjectUpdate(data));
        return mapProject(updated);
      } catch {
        return localUpdateProject(id, data);
      }
    },
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
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.project(id) });
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
      queryClient.invalidateQueries({ queryKey: repoKeys.companies() });
    },
  });
}

// DELETE /api/projects/:id — falls back to localStorage
export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del(`/api/projects/${id}`);
      } catch {
        localDeleteProject(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
      queryClient.invalidateQueries({ queryKey: repoKeys.companies() });
    },
  });
}
