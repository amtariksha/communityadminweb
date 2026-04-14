'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
}

interface AssignUserRoleInput {
  user_id: string;
  tenant_id: string;
  role: string;
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
        { tenant_id: input.tenant_id, role: input.role },
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
