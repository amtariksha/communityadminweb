'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/**
 * The next free badge number, to pre-fill Add Staff (STAFF-20,
 * GET /staff/badges/next). Null before the API has the route (404): the
 * field stays blank and the API gives the next number on save.
 */
export function useNextBadge(enabled: boolean) {
  return useQuery({
    queryKey: ['staff', 'badges', 'next'],
    queryFn: async function fetchNextBadge(): Promise<string | null> {
      try {
        return (await api.get<{ data: { badge_no: string } }>('/staff/badges/next')).data.badge_no;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled,
    staleTime: 0,
  });
}
