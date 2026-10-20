'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/** UNIT-30 — Access Control › Care Taker / Unit Manager (/rbac/unit-managers). */

export interface ManagedUnit {
  unit_id: string;
  label: string;
  valid_until: string | null;
}

export interface UnitManager {
  user_id: string;
  name: string | null;
  phone: string;
  status: 'active' | 'deactivated';
  since: string;
  deactivated_at: string | null;
  last_login_at: string | null;
  app_status: 'active' | 'never' | 'no_account';
  units: ManagedUnit[];
}

export interface AddUnitManagerInput {
  phone: string;
  name: string;
  unit_ids: string[];
  valid_until?: string | null;
}

export const unitManagerKeys = { all: ['access-control', 'unit-managers'] as const };

/** `null` while the API has no unit managers (404). */
export function useUnitManagers() {
  return useQuery({
    queryKey: unitManagerKeys.all,
    meta: { suppressToast: true },
    retry: false,
    queryFn: async (): Promise<UnitManager[] | null> => {
      try {
        return (await api.get<{ data: UnitManager[] }>('/rbac/unit-managers')).data;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useAddUnitManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddUnitManagerInput) => api.post<{ data: UnitManager }>('/rbac/unit-managers', input).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitManagerKeys.all }),
  });
}

export function useSetUnitManagerActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      api.post<{ data: UnitManager }>(`/rbac/unit-managers/${userId}/${active ? 'reactivate' : 'deactivate'}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: unitManagerKeys.all }),
  });
}
