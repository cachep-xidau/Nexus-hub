import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api-client';
import { repoKeys } from './use-repo-api/keys';
import {
  localCreateCompany,
  localDeleteCompany,
  localGetCompanies,
  localGetCompany,
  localUpdateCompany,
} from '../repo-local-store';
import type {
  ApiCompany,
  CreateCompanyInput,
  RepoCompany,
  UpdateCompanyInput,
} from './use-repo-api/types';

function mapCompany(company: ApiCompany): RepoCompany {
  return {
    id: company.id,
    name: company.name,
    description: company.description,
    created_at: new Date(company.createdAt).getTime(),
    updated_at: new Date(company.updatedAt).getTime(),
  };
}

export function useCompanies() {
  return useQuery({
    queryKey: repoKeys.companies(),
    queryFn: async () => {
      try {
        const companies = await api.get<ApiCompany[]>('/api/companies');
        return companies.map(mapCompany);
      } catch {
        return localGetCompanies();
      }
    },
  });
}

export function useCompany(id?: string) {
  return useQuery({
    queryKey: repoKeys.company(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Company id is required');
      try {
        const company = await api.get<ApiCompany>(`/api/companies/${id}`);
        return mapCompany(company);
      } catch {
        const local = localGetCompany(id);
        if (!local) throw new Error('Company not found');
        return local;
      }
    },
    enabled: Boolean(id),
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateCompanyInput) => {
      try {
        const created = await api.post<ApiCompany>('/api/companies', data);
        return mapCompany(created);
      } catch {
        return localCreateCompany(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.companies() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCompanyInput }) => {
      try {
        const updated = await api.put<ApiCompany>(`/api/companies/${id}`, data);
        return mapCompany(updated);
      } catch {
        return localUpdateCompany(id, data);
      }
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.companies() });
      queryClient.invalidateQueries({ queryKey: repoKeys.company(vars.id) });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del(`/api/companies/${id}`);
      } catch {
        localDeleteCompany(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.companies() });
      queryClient.invalidateQueries({ queryKey: repoKeys.projects() });
    },
  });
}
