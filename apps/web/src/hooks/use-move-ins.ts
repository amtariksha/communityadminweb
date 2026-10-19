'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/** A move-in from GET /tenant-lifecycle/move-ins (MOVE-06). */
export interface MoveIn {
  approval_id: string;
  request_type: 'tenant_onboarding' | 'tenant_self_onboard';
  onboarding_id: string;
  name: string;
  phone: string;
  block: string | null;
  unit_number: string;
  member_type: string;
  requested_at: string;
  requested_by_name: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  approved_at: string | null;
  approved_by_name: string | null;
  account_created: boolean;
}

export type MoveInFilters =
  | { state: 'pending'; level: 1 | 2; q?: string }
  | { state: 'approved'; from?: string; to?: string; q?: string };

export function moveInParams(filters: MoveInFilters): Record<string, string> {
  const params: Record<string, string> = { state: filters.state };
  if (filters.state === 'pending') params.level = String(filters.level);
  else {
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
  }
  if (filters.q) params.q = filters.q;
  return params;
}

/**
 * One page of move-ins. `null` when the API does not have the route yet
 * (404), so the screen can say "not available yet". Keyed under the
 * approvals so Approve / Reject refresh it.
 */
export function useMoveIns(filters: MoveInFilters & { page: number; limit: number }) {
  const { page, limit, ...rest } = filters;
  return useQuery({
    queryKey: ['approvals', 'move-ins', filters] as const,
    queryFn: async function fetchMoveIns(): Promise<{ data: MoveIn[]; total: number } | null> {
      try {
        return await api.get<{ data: MoveIn[]; total: number }>('/tenant-lifecycle/move-ins', {
          params: { ...moveInParams(rest as MoveInFilters), page: String(page), limit: String(limit) },
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}
