import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import {
  isoToTimestamp,
  type ApiAnalysisDoc,
  type AnalysisDoc,
  type CreateAnalysisDocInput,
  type UpdateAnalysisDocInput,
} from './types';

function mapAnalysisDoc(doc: ApiAnalysisDoc): AnalysisDoc {
  return {
    ...doc,
    project_id: doc.projectId,
    created_at: isoToTimestamp(doc.createdAt),
    updated_at: isoToTimestamp(doc.updatedAt),
  };
}

export function useAnalysisDocs(projectId: string) {
  return useQuery({
    queryKey: repoKeys.analysisDocs(projectId),
    queryFn: async () => {
      const docs = await api.get<ApiAnalysisDoc[]>(`/api/projects/${projectId}/analysis-docs`);
      return docs.map(mapAnalysisDoc);
    },
    enabled: !!projectId,
  });
}

export function useCreateAnalysisDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAnalysisDocInput & { projectId: string }) =>
      api.post<ApiAnalysisDoc>('/api/analysis-docs', data),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.analysisDocs(doc.projectId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.analysisDoc(doc.id) });
    },
  });
}

export function useUpdateAnalysisDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAnalysisDocInput }) =>
      api.put<ApiAnalysisDoc>(`/api/analysis-docs/${id}`, data),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.analysisDoc(doc.id) });
      queryClient.invalidateQueries({ queryKey: repoKeys.analysisDocs(doc.projectId) });
    },
  });
}

export function useDeleteAnalysisDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/api/analysis-docs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
