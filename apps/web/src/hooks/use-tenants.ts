'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Tenant, TenantSettings } from '@communityos/shared';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface TenantStats {
  total_units: number;
  total_members: number;
  total_invoices: number;
  total_collected: number;
  total_outstanding: number;
  active_vendors: number;
}

interface SuperAdminDashboard {
  total_tenants: number;
  active_tenants: number;
  total_units: number;
  total_users: number;
  total_revenue: number;
  recent_signups: Array<{
    id: string;
    name: string;
    created_at: string;
  }>;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface TenantFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateTenantInput {
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  subscription_plan: string;
  price_per_unit: number;
  admin_phone?: string;
}

interface UpdateTenantInput extends Partial<CreateTenantInput> {
  is_active?: boolean;
  settings_json?: TenantSettings;
}

interface UpdateTenantSettingsInput {
  tenant_id: string;
  settings: TenantSettings;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters?: TenantFilters) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
  stats: (id: string) => [...tenantKeys.all, 'stats', id] as const,
  superAdminDashboard: () => ['super-admin', 'dashboard'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: TenantFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.is_active !== undefined) params.is_active = String(filters.is_active);
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useTenants(filters?: TenantFilters) {
  return useQuery({
    queryKey: tenantKeys.list(filters),
    queryFn: function fetchTenants() {
      return api.get<PaginatedResponse<Tenant>>('/tenants', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: function fetchTenant() {
      return api.get<Tenant>(`/tenants/${id}`);
    },
    enabled: id !== '',
  });
}

export function useTenantStats(id: string) {
  return useQuery({
    queryKey: tenantKeys.stats(id),
    queryFn: function fetchTenantStats() {
      return api.get<TenantStats>(`/tenants/${id}/stats`);
    },
    enabled: id !== '',
  });
}

export function useSuperAdminDashboard() {
  return useQuery({
    queryKey: tenantKeys.superAdminDashboard(),
    queryFn: function fetchSuperAdminDashboard() {
      return api.get<SuperAdminDashboard>('/super-admin/dashboard');
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createTenant(input: CreateTenantInput) {
      // Backend now wraps in `{ data }` for M8 envelope consistency.
      return api
        .post<{ data: Tenant }>('/tenants', input)
        .then((res) => res.data);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
      queryClient.invalidateQueries({ queryKey: tenantKeys.superAdminDashboard() });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateTenant(params: {
      id: string;
      data: UpdateTenantInput;
    }) {
      return api.patch<Tenant>(`/tenants/${params.id}`, params.data);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useTenantSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateTenantSettings(input: UpdateTenantSettingsInput) {
      return api.patch<Tenant>(
        `/tenants/${input.tenant_id}/settings`,
        input.settings,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: tenantKeys.detail(variables.tenant_id),
      });
    },
  });
}
