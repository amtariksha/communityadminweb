'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * ANN-08 — how many people a Broadcast's recipients name, for the Send
 * confirmation. `null` on a server without the route (404).
 */
export function useAudienceCount(audience: string, blocks: readonly string[], enabled: boolean, includeManagers = false) {
  return useQuery({
    queryKey: ['notification-audience-count', audience, [...blocks].sort().join(','), includeManagers],
    meta: { suppressToast: true },
    retry: false,
    enabled,
    queryFn: async function fetchCount(): Promise<number | null> {
      try {
        const params: Record<string, string> = { audience };
        if (blocks.length > 0) params.blocks = blocks.join(',');
        // UNIT-30 — count the targeted units' caretakers too.
        if (includeManagers) params.include_managers = 'true';
        const res = await api.get<{ data: { count: number } }>('/notifications/audience-count', { params });
        return res.data.count;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}
