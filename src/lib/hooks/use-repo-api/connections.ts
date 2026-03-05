// ── MCP Connections Hooks ────────────────────────────────────────────────────
// API-first with localStorage fallback when backend is unavailable.
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
import {
  localGetMcpConnections,
  localCreateMcpConnection,
  localUpdateMcpConnection,
  localDeleteMcpConnection,
} from '../../repo-local-store';

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
      try {
        const connections = await api.get<ApiMcpConnection[]>(`/api/projects/${projectId}/mcp-connections`);
        return connections.map(mapConnection);
      } catch {
        return localGetMcpConnections(projectId);
      }
    },
    enabled: !!projectId,
  });
}

export function useCreateMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMcpConnectionInput & { projectId: string }) => {
      try {
        const created = await api.post<ApiMcpConnection>('/api/mcp-connections', data);
        return mapConnection(created);
      } catch {
        return localCreateMcpConnection(data.projectId, data);
      }
    },
    onSuccess: (_conn, variables) => {
      queryClient.invalidateQueries({ queryKey: repoKeys.connections(variables.projectId) });
    },
  });
}

export function useUpdateMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMcpConnectionInput }) => {
      try {
        const updated = await api.put<ApiMcpConnection>(`/api/mcp-connections/${id}`, toApiConnectionUpdate(data));
        return mapConnection(updated);
      } catch {
        return localUpdateMcpConnection(id, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}

export function useDeleteMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      try {
        await api.del<{ success: boolean }>(`/api/mcp-connections/${id}`);
      } catch {
        localDeleteMcpConnection(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repoKeys.all });
    },
  });
}
