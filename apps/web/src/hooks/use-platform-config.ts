'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformConfigItem {
  key: string;
  value: Record<string, unknown>;
  is_secret: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const platformConfigKeys = {
  all: ['platform-config'] as const,
  list: () => [...platformConfigKeys.all, 'list'] as const,
  detail: (key: string) => [...platformConfigKeys.all, 'detail', key] as const,
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function usePlatformConfig() {
  return useQuery({
    queryKey: platformConfigKeys.list(),
    queryFn: function fetchPlatformConfig() {
      return api.get<PlatformConfigItem[]>('/super-admin/platform-config');
    },
  });
}

export function usePlatformConfigByKey(key: string) {
  return useQuery({
    queryKey: platformConfigKeys.detail(key),
    queryFn: function fetchPlatformConfigByKey() {
      return api.get<PlatformConfigItem>(`/super-admin/platform-config/${key}`);
    },
    enabled: key !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useUpdatePlatformConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updatePlatformConfig(params: {
      key: string;
      value: Record<string, unknown>;
    }) {
      return api.patch<PlatformConfigItem>(
        `/super-admin/platform-config/${params.key}`,
        { value: params.value },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: platformConfigKeys.all });
    },
  });
}
