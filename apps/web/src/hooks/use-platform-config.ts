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
      // Backend wraps in { data: [...] } (M8 envelope). Unwrap here so
      // consumers can iterate configQuery.data directly — previously the
      // Super Admin → Platform Settings page crashed with
      // "n.data is not iterable" because configQuery.data was the
      // wrapper object, not the array.
      return api
        .get<{ data: PlatformConfigItem[] }>('/super-admin/platform-config')
        .then((res) => res.data);
    },
  });
}

export function usePlatformConfigByKey(key: string) {
  return useQuery({
    queryKey: platformConfigKeys.detail(key),
    queryFn: function fetchPlatformConfigByKey() {
      return api
        .get<{ data: PlatformConfigItem }>(`/super-admin/platform-config/${key}`)
        .then((res) => res.data);
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
      // Backend returns { data: { updated: true } } — unwrap so callers
      // can read `.updated` if they want. Current callers only use the
      // onSuccess side effect, so the exact shape doesn't matter, but
      // matching the list endpoint's unwrap keeps the hook consistent.
      return api
        .patch<{ data: { updated: boolean } }>(
          `/super-admin/platform-config/${params.key}`,
          { value: params.value },
        )
        .then((res) => res.data);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: platformConfigKeys.all });
    },
  });
}
