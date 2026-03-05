// ── Analysis Docs Hooks ─────────────────────────────────────────────────────
// API-first with localStorage fallback when backend is unavailable.
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
import {
  localGetAnalysisDocs,
  localCreateAnalysisDoc,
  localUpdateAnalysisDoc,
  localDeleteAnalysisDoc,
} from '../../repo-local-store';

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
      try {
        const docs = await api.get<ApiAnalysisDoc[]>(`/api/projects/${projectId}/analysis-docs`);
        return docs.map(mapAnalysisDoc);
      } catch {
        return localGetAnalysisDocs(projectId);
      }
    },
    enabled: !!projectId,
  });
}

export function useCreateAnalysisDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAnalysisDocInput & { projectId: string }) => {
      try {
        const created = await api.post<ApiAnalysisDoc>('/api/analysis-docs', data);
        return mapAnalysisDoc(created);
      } catch {
        return localCreateAnalysisDoc(data.projectId, data);
      }
    },
    onSuccess: (_doc, variables) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.analysisDocs(variables.projectId) });
    },
  });
}

export function useUpdateAnalysisDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAnalysisDocInput }) => {
      try {
        const updated = await api.put<ApiAnalysisDoc>(`/api/analysis-docs/${id}`, data);
        return mapAnalysisDoc(updated);
      } catch {
        return localUpdateAnalysisDoc(id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useDeleteAnalysisDoc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del<{ success: boolean }>(`/api/analysis-docs/${id}`);
      } catch {
        localDeleteAnalysisDoc(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
