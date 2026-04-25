'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface SuperAdminUnit {
  id: string;
  unit_number: string;
  block: string | null;
  floor: number | null;
}

/**
 * Fetch units for an arbitrary tenant using an x-tenant-id header
 * override. Used by the super-admin user-management dialog when
 * assigning a resident-type role — we need to show the tenant's
 * units to pick one. The regular `useUnits` pulls tenant from
 * localStorage which is wrong for cross-tenant super-admin flows.
 */
export function useSuperAdminUnitsForTenant(tenantId: string | null) {
  return useQuery({
    queryKey: ['super-admin-units', tenantId],
    enabled: !!tenantId,
    queryFn: async function fetchUnits(): Promise<SuperAdminUnit[]> {
      const token = getToken();
      const base =
        process.env.NEXT_PUBLIC_API_URL ??
        (typeof window !== 'undefined' && window.location.hostname === 'communityos.eassy.life'
          ? 'https://community.eassy.life'
          : 'http://localhost:4000');
      const res = await fetch(`${base}/units?limit=500`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch units' }));
        throw new Error(err.message ?? 'Failed to fetch units');
      }
      const payload = (await res.json()) as { data: SuperAdminUnit[] };
      return payload.data ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface SuperAdminUser {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  // Migration 056 — soft-delete metadata.
  deleted_at: string | null;
  delete_reason: string | null;
  tenant_count: number;
  tenant_roles: Array<{ tenant_name: string; role: string }>;
}

export interface UserRoleDetail {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  role_slug: string;
  role_name: string;
  assigned_at: string;
}

// ---------------------------------------------------------------------------
// Filter / Input types
// ---------------------------------------------------------------------------

interface UserSearchFilters {
  search?: string;
  page?: number;
  limit?: number;
  // Migration 056 — set true to surface soft-deleted users so the
  // operator can pick "Restore". Default false (deleted hidden).
  include_deleted?: boolean;
}

interface AssignUserRoleInput {
  user_id: string;
  tenant_id: string;
  role: string;
  // Required for resident roles (owner / tenant_resident / *_family).
  // Backend rejects with 400 if a resident role arrives without one.
  unit_id?: string;
  // ISO timestamp, optional. Non-resident roles only — backend rejects
  // expires_at on resident roles since resident expiry inherits from
  // units.lease_end_date.
  expires_at?: string;
}

interface RemoveUserRoleInput {
  user_id: string;
  tenant_id: string;
  role_slug: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const superAdminUserKeys = {
  all: ['super-admin', 'users'] as const,
  lists: () => [...superAdminUserKeys.all, 'list'] as const,
  list: (filters?: UserSearchFilters) =>
    [...superAdminUserKeys.lists(), filters] as const,
  roles: (userId: string) =>
    [...superAdminUserKeys.all, 'roles', userId] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(
  filters?: UserSearchFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  if (filters.include_deleted) params.include_deleted = 'true';
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useSuperAdminUsers(filters?: UserSearchFilters) {
  return useQuery({
    queryKey: superAdminUserKeys.list(filters),
    queryFn: function fetchUsers() {
      return api.get<PaginatedResponse<SuperAdminUser>>('/super-admin/users', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useSuperAdminUserRoles(userId: string) {
  return useQuery({
    queryKey: superAdminUserKeys.roles(userId),
    queryFn: function fetchUserRoles() {
      return api.get<UserRoleDetail[]>(`/super-admin/users/${userId}/roles`);
    },
    enabled: userId !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useAssignUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function assignRole(input: AssignUserRoleInput) {
      return api.post<{ message: string }>(
        `/super-admin/users/${input.user_id}/roles`,
        {
          tenant_id: input.tenant_id,
          role: input.role,
          ...(input.unit_id ? { unit_id: input.unit_id } : {}),
          ...(input.expires_at ? { expires_at: input.expires_at } : {}),
        },
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: superAdminUserKeys.roles(variables.user_id),
      });
      queryClient.invalidateQueries({
        queryKey: superAdminUserKeys.lists(),
      });
    },
  });
}

export function useRemoveUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function removeRole(input: RemoveUserRoleInput) {
      return api.delete<{ message: string }>(
        `/super-admin/users/${input.user_id}/roles/${input.tenant_id}/${input.role_slug}`,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: superAdminUserKeys.roles(variables.user_id),
      });
      queryClient.invalidateQueries({
        queryKey: superAdminUserKeys.lists(),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Soft delete (migration 056)
// ---------------------------------------------------------------------------

export interface DeleteSuperAdminUserInput {
  user_id: string;
  reason: string;
  /**
   * If the user is the only `community_admin` of one or more tenants,
   * the backend returns 400 with `code: 'last_admin_orphaning'` and a
   * tenants list. The caller can confirm with the operator and re-issue
   * the request with `force: true` to delete anyway. Without force, the
   * UI surfaces the orphaning warning and stops.
   */
  force?: boolean;
}

export function useDeleteSuperAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deleteUser(input: DeleteSuperAdminUserInput) {
      return api.delete<{
        deleted_at: string;
        cancelled_subscriptions: number;
      }>(`/super-admin/users/${input.user_id}`, {
        reason: input.reason,
        force: input.force ?? false,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({
        queryKey: superAdminUserKeys.lists(),
      });
    },
  });
}

export function useRestoreSuperAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function restoreUser(userId: string) {
      return api.post<{ restored: true }>(
        `/super-admin/users/${userId}/restore`,
        {},
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({
        queryKey: superAdminUserKeys.lists(),
      });
    },
  });
}
