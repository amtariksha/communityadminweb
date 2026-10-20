'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/** UNIT-31 — Units & Users › Statistics (GET /units/adoption…) and Bulk Invite (POST /units/invites). */

export interface AdoptionRatio {
  key: string;
  label: string;
  count: number;
  of: number;
}

export interface AdoptionStats {
  ratios: AdoptionRatio[];
  categories: Array<{ key: string; label: string; count: number }>;
}

export interface AdoptionCandidate {
  member_id: string;
  name: string | null;
  unit: string;
  member_type: string;
  last_login_at: string | null;
  invited_on: string | null;
}

export interface InviteResult {
  sent: number;
  skipped: number;
  failed: number;
}

export const ADOPTION_CRITERIA = [
  { value: 'never_logged_in', label: 'Never logged in (all)' },
  { value: 'never_logged_in_owners', label: 'Never logged in — owners' },
  { value: 'never_logged_in_tenants', label: 'Never logged in — tenants' },
  { value: 'never_logged_in_primary', label: 'Never logged in — primary contacts' },
  { value: 'not_invited', label: 'Not invited yet' },
  { value: 'invited_over_7_days', label: 'Invited more than 7 days ago' },
] as const;

export const adoptionKeys = {
  stats: ['units', 'adoption'] as const,
  candidates: (criterion: string) => ['units', 'adoption', 'candidates', criterion] as const,
};

async function orNull<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** `null` on an API without Statistics (404). */
export function useAdoptionStats() {
  return useQuery({
    queryKey: adoptionKeys.stats,
    meta: { suppressToast: true },
    retry: false,
    queryFn: () => orNull(() => api.get<{ data: AdoptionStats }>('/units/adoption').then((res) => res.data)),
  });
}

/** The people a criterion names; runs when Filter is pressed (`criterion` set). */
export function useAdoptionCandidates(criterion: string | null) {
  return useQuery({
    queryKey: adoptionKeys.candidates(criterion ?? ''),
    enabled: criterion !== null,
    meta: { suppressToast: true },
    retry: false,
    queryFn: () =>
      orNull(() => api.get<{ data: AdoptionCandidate[]; total: number }>('/units/adoption/candidates', { params: { criterion: criterion ?? '' } })),
  });
}

export function useBulkInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberIds: string[]) => api.post<{ data: InviteResult }>('/units/invites', { member_ids: memberIds }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adoptionKeys.stats }),
  });
}
