'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { SuperAdminUser } from '@/hooks/use-super-admin-users';

/**
 * Shape returned by both `/users/search` (tenant) and `/super-admin/users`
 * (cross-tenant) — the `UserSearchSelect` component renders rows with
 * this contract regardless of scope.
 *
 * `units` and `roles` are scoped to the calling tenant for the tenant
 * scope, and aggregated across all tenants for super-admin scope.
 */
export interface UserSearchHit {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  units: Array<{
    unit_id: string;
    unit_number: string;
    member_type: string;
    is_current: boolean;
  }>;
  roles: string[];
}

export type UserSearchScope = 'tenant' | 'super-admin';

interface TenantSearchResponse {
  data: UserSearchHit[];
}

interface SuperAdminSearchResponse {
  data: SuperAdminUser[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Search the user directory.
 *
 * - `tenant` scope hits the new `GET /users/search` and only sees users
 *   already attached to the caller's tenant (via `user_tenant_roles`
 *   OR `members`). Returns rich per-tenant unit + role detail.
 * - `super-admin` scope hits `GET /super-admin/users?search=` (the
 *   existing cross-tenant directory). Returns aggregated tenant-roles.
 *
 * Both branches normalise to `UserSearchHit[]` so the component renders
 * uniformly.
 *
 * The `enabled` flag prevents firing while the user types fewer than 3
 * chars — saves an API round-trip per keystroke.
 */
export function useUserSearch(
  query: string,
  scope: UserSearchScope,
): UseQueryResult<UserSearchHit[], Error> {
  const trimmed = query.trim();
  const enabled = trimmed.length >= 3;

  return useQuery({
    queryKey: ['user-search', scope, trimmed],
    enabled,
    staleTime: 30_000,
    queryFn: async function fetchSearch(): Promise<UserSearchHit[]> {
      if (scope === 'tenant') {
        const res = await api.get<TenantSearchResponse>('/users/search', {
          params: { q: trimmed, limit: '10' },
        });
        return res.data ?? [];
      }
      const res = await api.get<SuperAdminSearchResponse>('/super-admin/users', {
        params: { search: trimmed, limit: '10', page: '1' },
      });
      // Map the super-admin shape onto UserSearchHit. The super-admin
      // endpoint doesn't return units; expose an empty array so the
      // renderer can decide to skip the unit-pill row.
      return (res.data ?? []).map((u) => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        email: u.email,
        units: [],
        roles: u.tenant_roles?.map((tr) => tr.role) ?? [],
      }));
    },
  });
}
