'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';

/** UNIT-22 / UNIT-23 / UNIT-24 — Access Control people and per-person module switches (/rbac/people). */

export type PersonKind = 'committee' | 'office_staff';

export interface AdminPerson {
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  kind: PersonKind | 'unit_manager';
  designation: string | null;
  email_access_disabled: boolean;
  status: 'active' | 'deactivated';
  roles: string[];
  deactivated_roles: string[] | null;
  deactivated_at: string | null;
  joined_on: string;
  units: string | null;
  last_login_at: string | null;
  app_status: 'active' | 'never' | 'no_account';
  access_count: number;
  locked: boolean;
}

export interface ModuleSwitch {
  module_id: string;
  label: string;
  enabled: boolean;
  locked: boolean;
}

export interface PersonModules {
  modules: ModuleSwitch[];
  count: number;
  locked: boolean;
}

export const accessKeys = {
  people: (kind: PersonKind) => ['access-control', 'people', kind] as const,
  modules: (userId: string) => ['access-control', 'modules', userId] as const,
  mine: ['access-control', 'me'] as const,
};

async function orNull<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** `null` while the API has no Access Control (404). */
export function useAdminPeople(kind: PersonKind) {
  return useQuery({
    queryKey: accessKeys.people(kind),
    meta: { suppressToast: true },
    retry: false,
    queryFn: () => orNull(() => api.get<{ data: AdminPerson[] }>('/rbac/people', { params: { kind } }).then((res) => res.data)),
  });
}

export function usePersonModules(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: accessKeys.modules(userId),
    enabled,
    queryFn: () => api.get<{ data: PersonModules }>(`/rbac/people/${userId}/modules`).then((res) => res.data),
  });
}

/** UNIT-24 — the signed-in person's switches; `null` on an API without them, or for a role it refuses. */
export function useMyModules(enabled = true) {
  return useQuery({
    queryKey: accessKeys.mine,
    enabled,
    meta: { suppressToast: true },
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return (await api.get<{ data: PersonModules }>('/rbac/me/modules')).data;
      } catch {
        return null;
      }
    },
  });
}

export interface AddPersonInput {
  phone: string;
  name?: string;
  role: string;
  designation?: string;
  kind: PersonKind;
}

export interface PersonChanges {
  designation?: string | null;
  email_access_disabled?: boolean;
}

function useRefresh() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['access-control'] });
}

export function useAddPerson() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (input: AddPersonInput) => api.post('/rbac/people', input), onSuccess: refresh });
}

export function useUpdatePerson() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ userId, changes }: { userId: string; changes: PersonChanges }) => api.patch(`/rbac/people/${userId}`, changes),
    onSuccess: refresh,
  });
}

export function useSetPersonActive() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      api.post(`/rbac/people/${userId}/${active ? 'reactivate' : 'deactivate'}`),
    onSuccess: refresh,
  });
}

export function useSavePersonModules() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ userId, modules }: { userId: string; modules: { all: true } | { modules: Array<{ module_id: string; enabled: boolean }> } }) =>
      api.put(`/rbac/people/${userId}/modules`, modules),
    onSuccess: refresh,
  });
}
