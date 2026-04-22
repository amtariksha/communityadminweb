'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unitKeys } from './use-units';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface UnitDetailMember {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  member_type: string;
  parent_member_id: string | null;
  move_in_date: string;
  move_out_date: string | null;
  lease_end_date: string | null;
  is_primary_contact: boolean;
  is_active: boolean;
  created_at: string;
}

export interface OccupancyTimelineEntry {
  member_id: string;
  name: string | null;
  member_type: string;
  move_in_date: string;
  move_out_date: string | null;
}

export interface UnitDetailResponse {
  unit: {
    id: string;
    unit_number: string;
    block: string | null;
    floor: number;
    area_sqft: number;
    unit_type: string;
    is_occupied: boolean;
    is_active: boolean;
  };
  current_members: UnitDetailMember[];
  past_members: UnitDetailMember[];
  occupancy_timeline: OccupancyTimelineEntry[];
}

export interface DirectoryMember {
  id: string;
  user_id: string;
  unit_id: string;
  unit_number: string;
  block: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  member_type: string;
  move_in_date: string;
  is_primary_contact: boolean;
  // Derived from members.lease_end_date. Null for owner / owner_family
  // (ownership doesn't expire) and for societies that don't track
  // leases. When set and in the past, the resident is blocked from
  // the Flutter app — community admin can override via the edit
  // dialog in Member Directory.
  lease_end_date: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface OccupancyBlockBreakdown {
  block: string;
  total: number;
  occupied: number;
  vacant: number;
  occupancy_pct: number;
}

export interface OccupancyReport {
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_pct: number;
  total_owners: number;
  total_tenants: number;
  block_breakdown: OccupancyBlockBreakdown[];
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface DirectoryFilters {
  search?: string;
  member_type?: string;
  block?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface UpdateMemberInput {
  unitId: string;
  memberId: string;
  name?: string;
  phone?: string;
  email?: string | null;
  member_type?: string;
  is_primary_contact?: boolean;
  lease_end_date?: string | null;
}

export interface TransferOwnershipInput {
  unitId: string;
  name: string;
  phone: string;
  email?: string;
  move_in_date?: string;
}

export interface DisconnectTenantInput {
  unitId: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const unitMemberKeys = {
  all: ['unit-members'] as const,
  details: () => [...unitMemberKeys.all, 'detail'] as const,
  detail: (unitId: string) => [...unitMemberKeys.details(), unitId] as const,
  directory: () => [...unitMemberKeys.all, 'directory'] as const,
  directoryList: (filters?: DirectoryFilters) =>
    [...unitMemberKeys.directory(), filters] as const,
  occupancy: () => [...unitMemberKeys.all, 'occupancy'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function directoryFiltersToParams(
  filters?: DirectoryFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.member_type) params.member_type = filters.member_type;
  if (filters.block) params.block = filters.block;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useUnitDetail(unitId: string) {
  return useQuery({
    queryKey: unitMemberKeys.detail(unitId),
    queryFn: function fetchUnitDetail() {
      return api
        .get<{ data: UnitDetailResponse }>(`/units/${unitId}/detail`)
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: unitId !== '',
  });
}

export function useMemberDirectory(filters?: DirectoryFilters) {
  return useQuery({
    queryKey: unitMemberKeys.directoryList(filters),
    queryFn: function fetchDirectory() {
      return api.get<PaginatedResponse<DirectoryMember>>(
        '/units/directory/members',
        { params: directoryFiltersToParams(filters) },
      );
    },
  });
}

export function useOccupancyReport() {
  return useQuery({
    queryKey: unitMemberKeys.occupancy(),
    queryFn: function fetchOccupancy() {
      return api
        .get<{ data: OccupancyReport }>('/units/occupancy/report')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useUpdateMemberDetail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateMember({
      unitId,
      memberId,
      ...body
    }: UpdateMemberInput) {
      return api.patch(`/units/${unitId}/members/${memberId}`, body);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: unitMemberKeys.detail(variables.unitId),
      });
      queryClient.invalidateQueries({ queryKey: unitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: unitKeys.stats() });
      queryClient.invalidateQueries({
        queryKey: unitMemberKeys.directory(),
      });
    },
  });
}

export function useTransferOwnership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function transferOwnership({
      unitId,
      ...body
    }: TransferOwnershipInput) {
      return api.post(`/units/${unitId}/transfer-ownership`, body);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: unitMemberKeys.detail(variables.unitId),
      });
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
      queryClient.invalidateQueries({
        queryKey: unitMemberKeys.directory(),
      });
    },
  });
}

export function useDisconnectTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function disconnectTenant({ unitId }: DisconnectTenantInput) {
      return api.post(`/units/${unitId}/disconnect-tenant`);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: unitMemberKeys.detail(variables.unitId),
      });
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
      queryClient.invalidateQueries({
        queryKey: unitMemberKeys.directory(),
      });
    },
  });
}
