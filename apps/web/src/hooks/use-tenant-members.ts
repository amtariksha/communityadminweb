'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { superAdminUserKeys } from './use-super-admin-users';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface TenantMember {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  roles: string[];
  role_names: string[];
  unit_number: string | null;
}

export interface AddMemberResult {
  user: {
    id: string;
    phone: string;
    name: string | null;
    is_new: boolean;
  };
  role_assigned: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Filter / Input types
// ---------------------------------------------------------------------------

export interface TenantMemberFilters {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

interface AddMemberInput {
  tenant_id: string;
  phone: string;
  role: string;
}

interface AddMemberWithRolesInput {
  tenant_id: string;
  phone: string;
  roles: string[];
  // QA #214 — surfaced on the Add Member dialog. Backfills the user's
  // name on the freshly-created (or empty-named) row so the directory
  // doesn't render "Unknown" until they log in via OTP.
  name?: string;
  // QA #215 — when one of the roles is a resident type, super-admin
  // requires unit_id so the `members` row gets created and the unit
  // detail page renders the owner instead of "Unassigned".
  unit_id?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const tenantMemberKeys = {
  all: ['super-admin', 'tenant-members'] as const,
  lists: () => [...tenantMemberKeys.all, 'list'] as const,
  list: (tenantId: string, filters?: TenantMemberFilters) =>
    [...tenantMemberKeys.lists(), tenantId, filters] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(
  filters?: TenantMemberFilters,
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
// Queries
// ---------------------------------------------------------------------------

export function useTenantMembers(tenantId: string, filters?: TenantMemberFilters) {
  return useQuery({
    queryKey: tenantMemberKeys.list(tenantId, filters),
    queryFn: function fetchTenantMembers() {
      return api.get<PaginatedResponse<TenantMember>>(
        `/super-admin/tenants/${tenantId}/members`,
        { params: filtersToParams(filters) },
      );
    },
    enabled: tenantId !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useAddMemberToTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function addMember(input: AddMemberInput) {
      return api.post<AddMemberResult>(
        `/super-admin/tenants/${input.tenant_id}/members`,
        { phone: input.phone, role: input.role },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tenantMemberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: superAdminUserKeys.lists() });
    },
  });
}

export function useUpdateTenantMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateMember({
      tenantId,
      userId,
      ...body
    }: {
      tenantId: string;
      userId: string;
      name?: string;
      roles?: string[];
      unit_id?: string | null;
    }) {
      return api.patch(
        `/super-admin/tenants/${tenantId}/members/${userId}`,
        body,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tenantMemberKeys.all });
    },
  });
}

export function useRemoveTenantMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function removeMember({
      tenantId,
      userId,
    }: {
      tenantId: string;
      userId: string;
    }) {
      return api.delete(`/super-admin/tenants/${tenantId}/members/${userId}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tenantMemberKeys.all });
      queryClient.invalidateQueries({ queryKey: superAdminUserKeys.lists() });
    },
  });
}

export function useAddMemberWithRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async function addMemberWithRoles(input: AddMemberWithRolesInput) {
      const results: AddMemberResult[] = [];
      for (const role of input.roles) {
        // Pass name + unit_id on each call. Backend ignores name on the
        // 2nd+ POST (already-set) and only honors unit_id on resident
        // roles — non-resident roles silently drop it. Idempotency is
        // safe: super-admin throws ConflictException on duplicate role,
        // which the dialog surfaces as a toast.
        const result = await api.post<AddMemberResult>(
          `/super-admin/tenants/${input.tenant_id}/members`,
          {
            phone: input.phone,
            role,
            ...(input.name ? { name: input.name } : {}),
            ...(input.unit_id ? { unit_id: input.unit_id } : {}),
          },
        );
        results.push(result);
      }
      return results;
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tenantMemberKeys.lists() });
      queryClient.invalidateQueries({ queryKey: superAdminUserKeys.lists() });
    },
  });
}
