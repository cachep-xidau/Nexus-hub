import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api-client';
import { repoKeys } from './keys';
import {
  isoToTimestamp,
  type ApiMcpConnection,
  type McpConnection,
  type CreateMcpConnectionInput,
  type UpdateMcpConnectionInput,
} from './types';

function mapConnection(connection: ApiMcpConnection): McpConnection {
  return {
    ...connection,
    tool_count: connection.toolCount,
    project_id: connection.projectId,
    created_at: isoToTimestamp(connection.createdAt),
    updated_at: isoToTimestamp(connection.updatedAt),
  };
}

function toApiConnectionUpdate(data: UpdateMcpConnectionInput) {
  const { tool_count, toolCount, ...rest } = data;
  return {
    ...rest,
    ...(toolCount !== undefined
      ? { toolCount }
      : tool_count !== undefined
        ? { toolCount: tool_count }
        : {}),
  };
}

export function useMcpConnections(projectId: string) {
  return useQuery({
    queryKey: repoKeys.connections(projectId),
    queryFn: async () => {
      const connections = await api.get<ApiMcpConnection[]>(`/api/projects/${projectId}/mcp-connections`);
      return connections.map(mapConnection);
    },
    enabled: !!projectId,
  });
}

export function useCreateMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMcpConnectionInput & { projectId: string }) =>
      api.post<ApiMcpConnection>('/api/mcp-connections', data),
    onSuccess: (connection) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.connections(connection.projectId) });
      queryClient.invalidateQueries({ queryKey: repoKeys.connection(connection.id) });
    },
  });
}

export function useUpdateMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMcpConnectionInput }) =>
      api.put<ApiMcpConnection>(`/api/mcp-connections/${id}`, toApiConnectionUpdate(data)),
    onSuccess: (connection) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.connection(connection.id) });
      queryClient.invalidateQueries({ queryKey: repoKeys.connections(connection.projectId) });
    },
  });
}

export function useDeleteMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<{ success: boolean }>(`/api/mcp-connections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
