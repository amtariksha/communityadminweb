'use client';

/**
 * Tenant admin/staff role management hooks. Backed by /rbac/admins on
 * the API (community_admin and super_admin only). The role allow-list
 * is duplicated here so the form's role-picker matches the server's
 * Zod enum exactly — keep in sync with
 * communityos/apps/api/src/modules/rbac/rbac.service.ts ADMIN_ROLE_ALLOW_LIST.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unitMemberKeys } from './use-unit-members';

export const ADMIN_ROLE_ALLOW_LIST = [
  'community_admin',
  'committee_member',
  'accountant',
  'manager',
  'security_supervisor',
  'facility_supervisor',
  'guard_supervisor',
  'auditor',
  'moderator',
] as const;

export type AdminRoleSlug = (typeof ADMIN_ROLE_ALLOW_LIST)[number];

export interface TenantAdminRow {
  user_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  roles: string[];
  created_at: string;
}

export interface TenantAdminFilters {
  search?: string;
  role?: AdminRoleSlug;
  page?: number;
  limit?: number;
}

export interface AddAdminInput {
  phone: string;
  role: AdminRoleSlug;
}

export interface ReplaceAdminRolesInput {
  userId: string;
  roles: AdminRoleSlug[];
}

export interface RemoveAdminRoleInput {
  userId: string;
  slug: AdminRoleSlug;
}

export const tenantAdminKeys = {
  all: ['rbac-admins'] as const,
  list: (filters?: TenantAdminFilters) =>
    [...tenantAdminKeys.all, 'list', filters ?? {}] as const,
};

function filtersToParams(
  filters?: TenantAdminFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.role) params.role = filters.role;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export function useTenantAdmins(filters?: TenantAdminFilters) {
  return useQuery({
    queryKey: tenantAdminKeys.list(filters),
    queryFn: function fetchTenantAdmins() {
      return api.get<{ data: TenantAdminRow[]; total: number }>(
        '/rbac/admins',
        { params: filtersToParams(filters) },
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — every successful mutation invalidates BOTH the dedicated
// admin list and the unified Member Directory list (which surfaces
// admin-only rows alongside residents).
// ---------------------------------------------------------------------------

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: tenantAdminKeys.all });
  queryClient.invalidateQueries({
    queryKey: unitMemberKeys.directoryList(undefined),
    exact: false,
  });
}

export function useAddTenantAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function addAdmin(input: AddAdminInput) {
      return api.post<{
        data: {
          user_id: string;
          phone: string;
          name: string | null;
          role: string;
          created: boolean;
          is_new_user: boolean;
        };
      }>('/rbac/admins', input);
    },
    onSuccess() {
      invalidateAll(queryClient);
    },
  });
}

export function useReplaceTenantAdminRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function replaceRoles(input: ReplaceAdminRolesInput) {
      return api.patch<{ data: { user_id: string; roles: string[] } }>(
        `/rbac/admins/${input.userId}`,
        { roles: input.roles },
      );
    },
    onSuccess() {
      invalidateAll(queryClient);
    },
  });
}

export function useRemoveTenantAdminRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function removeRole(input: RemoveAdminRoleInput) {
      return api.delete<{ data: { user_id: string; role: string } }>(
        `/rbac/admins/${input.userId}/roles/${input.slug}`,
      );
    },
    onSuccess() {
      invalidateAll(queryClient);
    },
  });
}
