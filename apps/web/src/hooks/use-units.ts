'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Unit, Member } from '@communityos/shared';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

interface UnitStats {
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  total_members: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

interface UnitFilters {
  search?: string;
  block?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateUnitInput {
  unit_number: string;
  floor: number;
  block?: string | null;
  area_sqft: number;
  unit_type: string;
}

interface UpdateUnitInput extends Partial<CreateUnitInput> {
  is_occupied?: boolean;
  is_active?: boolean;
}

interface BulkImportUnitsInput {
  units: CreateUnitInput[];
}

interface CsvImportRow {
  unit_number: string;
  // `null` means the parser explicitly couldn't derive a value; the
  // import pipeline later coalesces to undefined for the API.
  floor?: number | null;
  block?: string | null;
  area_sqft?: number | null;
  unit_type?: string;
  apartment_number?: string | null;
  bhk_type?: string | null;
  garden_area?: number | null;
  occupancy_status?: string | null;
  maintenance_amount?: number | null;
  maintenance_rate_1?: number | null;
  maintenance_rate_2?: number | null;
  meter_number?: string | null;
  meter_in_owner_name?: boolean | null;
  khata_in_owner_name?: boolean | null;
  intercom?: string | null;
  parking_slot?: string | null;
  previous_owner?: string | null;
  transfer_amount_received?: boolean | null;
  metadata?: Record<string, unknown>;
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_email?: string | null;
  owner_pan?: string | null;
  owner_id_proof?: string | null;
  tenant_name?: string | null;
  tenant_phone?: string | null;
  tenant_email?: string | null;
  lease_end_date?: string | null;
}

interface CsvImportInput {
  rows: CsvImportRow[];
  source?: 'adda' | 'nobroker' | 'mygate' | 'apnacomplex' | 'custom';
}

interface CsvImportResult {
  units_created: number;
  units_updated: number;
  members_created: number;
  errors: string[];
}

interface AddMemberInput {
  unit_id: string;
  user_id?: string;
  phone?: string;
  name?: string;
  member_type: string;
  move_in_date: string;
  is_primary_contact?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const unitKeys = {
  all: ['units'] as const,
  lists: () => [...unitKeys.all, 'list'] as const,
  list: (filters?: UnitFilters) => [...unitKeys.lists(), filters] as const,
  details: () => [...unitKeys.all, 'detail'] as const,
  detail: (id: string) => [...unitKeys.details(), id] as const,
  stats: () => [...unitKeys.all, 'stats'] as const,
  members: (unitId: string) => [...unitKeys.all, unitId, 'members'] as const,
  blocks: () => [...unitKeys.all, 'blocks'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: UnitFilters): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.block) params.block = filters.block;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useUnits(filters?: UnitFilters) {
  return useQuery({
    queryKey: unitKeys.list(filters),
    queryFn: function fetchUnits() {
      return api.get<PaginatedResponse<Unit>>('/units', {
        params: filtersToParams(filters),
      });
    },
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: unitKeys.detail(id),
    queryFn: function fetchUnit() {
      return api.get<{ data: Unit }>(`/units/${id}`).then(function unwrap(res) {
        return res.data;
      });
    },
    enabled: id !== '',
  });
}

export function useUnitStats() {
  return useQuery({
    queryKey: unitKeys.stats(),
    queryFn: function fetchUnitStats() {
      return api.get<{ data: UnitStats }>('/units/stats').then(function unwrap(res) {
        return res.data;
      });
    },
  });
}

export function useBlocks() {
  return useQuery({
    queryKey: unitKeys.blocks(),
    queryFn: function fetchBlocks() {
      return api.get<{ data: string[] }>('/units/blocks').then(function unwrap(res) {
        return res.data;
      });
    },
  });
}

export function useUnitMembers(unitId: string) {
  return useQuery({
    queryKey: unitKeys.members(unitId),
    queryFn: function fetchUnitMembers() {
      return api.get<{ data: Member[] }>(`/units/${unitId}/members`).then(
        function unwrap(res) {
          return res.data;
        },
      );
    },
    enabled: unitId !== '',
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createUnit(input: CreateUnitInput) {
      return api.post<{ data: Unit }>('/units', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateUnit(params: { id: string; data: UpdateUnitInput }) {
      return api.patch<{ data: Unit }>(`/units/${params.id}`, params.data);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: unitKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: unitKeys.lists() });
      queryClient.invalidateQueries({ queryKey: unitKeys.stats() });
    },
  });
}

export function useBulkImportUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bulkImportUnits(input: BulkImportUnitsInput) {
      return api.post<{ message: string }>('/units/import', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function addMember(input: AddMemberInput) {
      return api.post<{ data: Member }>(`/units/${input.unit_id}/members`, input);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: unitKeys.members(variables.unit_id) });
      queryClient.invalidateQueries({ queryKey: unitKeys.detail(variables.unit_id) });
      queryClient.invalidateQueries({ queryKey: unitKeys.stats() });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function removeMember(params: { unitId: string; memberId: string }) {
      return api.delete<{ message: string }>(
        `/units/${params.unitId}/members/${params.memberId}`,
      );
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({ queryKey: unitKeys.members(variables.unitId) });
      queryClient.invalidateQueries({ queryKey: unitKeys.detail(variables.unitId) });
      queryClient.invalidateQueries({ queryKey: unitKeys.stats() });
    },
  });
}

export function useCsvImportUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function csvImportUnits(input: CsvImportInput) {
      return api.post<{ data: CsvImportResult }>('/units/import-csv', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export function useBulkImportMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function importMembers(input: {
      members: Array<{
        unit_number: string;
        name: string;
        phone: string;
        member_type: 'owner' | 'tenant' | 'owner_family' | 'tenant_family';
        email?: string;
        move_in_date?: string;
      }>;
    }) {
      return api.post<{ data: { imported: number; skipped: number; errors: string[] } }>(
        '/units/import-members',
        input,
      );
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: unitKeys.all });
    },
  });
}

export type { CsvImportRow, CsvImportInput, CsvImportResult };
