'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/api-error';
import { staffFiltersToParams, staffKeys, type Staff, type StaffSearchKey, type StaffStatus } from './use-staff';

/**
 * STAFF-42 — Staff Manager's one register: society staff (Official) and
 * household help (Domestic, with the flats they serve) on the status lists,
 * and Add / Edit for household help through /workers. Against an API
 * without the register the lists read /staff/employees (society staff only).
 */

export type StaffKind = 'official' | 'domestic';
export type RegisterSearchKey = StaffSearchKey | 'unit';

export interface StaffRegisterRow {
  kind: StaffKind;
  id: string;
  badge_no: string | null;
  name: string;
  category_id: string | null;
  category_name: string;
  designation: string | null;
  phone: string | null;
  status: StaffStatus;
  status_reason: string | null;
  status_changed_at: string | null;
  join_date: string | null;
  exit_date: string | null;
  badge_valid_until: string | null;
  shift: string | null;
  units: string | null;
  unit_ids: string[];
}

export type StaffStatusCounts = Record<StaffStatus, number>;

export interface StaffRegisterPage {
  data: StaffRegisterRow[];
  total: number;
  /** Null on an older API (no register). */
  counts: StaffStatusCounts | null;
  /** True when the rows came from /staff/employees (no household help, no Unit search). */
  legacy: boolean;
}

export interface StaffRegisterFilters {
  status: StaffStatus;
  q?: string;
  by?: RegisterSearchKey;
  page?: number;
  limit?: number;
}

/** The query string of the register and its export. */
export function registerParams(filters: StaffRegisterFilters): Record<string, string> {
  const params: Record<string, string> = { status: filters.status };
  if (filters.q) params.q = filters.q;
  if (filters.q && filters.by && filters.by !== 'any') params.by = filters.by;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

const label = (slug: string): string => slug.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

/** A /staff/employees row as a register row (an older API). */
export function registerRowOf(staff: Staff): StaffRegisterRow {
  return {
    kind: 'official',
    id: staff.id,
    badge_no: staff.badge_no ?? null,
    name: staff.name,
    category_id: staff.category_id ?? null,
    category_name: label(staff.staff_type),
    designation: staff.designation,
    phone: staff.phone,
    status: staff.status ?? (staff.is_active ? 'active' : 'retired'),
    status_reason: staff.status_reason ?? null,
    status_changed_at: staff.status_changed_at ?? null,
    join_date: staff.join_date,
    exit_date: staff.exit_date,
    badge_valid_until: staff.badge_valid_until ?? null,
    shift: null,
    units: null,
    unit_ids: [],
  };
}

async function loadLegacy(filters: StaffRegisterFilters): Promise<StaffRegisterPage> {
  // An older API has no Unit search: it looks everywhere instead.
  const searchBy = filters.by === 'unit' ? 'any' : filters.by;
  const res = await api.get<{ data: Staff[]; total: number }>('/staff/employees', {
    params: staffFiltersToParams({ status: filters.status, q: filters.q, search_by: searchBy, page: filters.page, limit: filters.limit }),
  });
  return { data: res.data.map(registerRowOf), total: res.total, counts: null, legacy: true };
}

export const staffRegisterKeys = {
  // Under the employee keys, so every employee save refreshes the register too.
  all: [...staffKeys.employees(), 'register'] as const,
  list: (filters: StaffRegisterFilters) => [...staffRegisterKeys.all, 'list', filters] as const,
  domestic: (id: string) => [...staffRegisterKeys.all, 'domestic', id] as const,
};

export function useStaffRegister(filters: StaffRegisterFilters) {
  return useQuery({
    queryKey: staffRegisterKeys.list(filters),
    queryFn: async function fetchStaffRegister(): Promise<StaffRegisterPage> {
      try {
        const res = await api.get<{ data: StaffRegisterRow[]; total: number; counts: StaffStatusCounts }>('/staff/register', {
          params: registerParams(filters),
        });
        return { ...res, legacy: false };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return loadLegacy(filters);
        throw error;
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Household help (Domestic) records
// ---------------------------------------------------------------------------

export interface DomesticStaff {
  id: string;
  name: string;
  phone: string;
  category: string;
  category_id: string | null;
  status: StaffStatus;
  unit_ids: string[];
  units: Array<{ id: string; label: string }>;
  badge_no: string | null;
  badge_issued_on: string | null;
  badge_valid_until: string | null;
  gender: Staff['gender'];
  qualification: string | null;
  skills: string | null;
  languages: string | null;
  notes: string | null;
  address: string | null;
  id_proof_number: string | null;
  join_date: string | null;
  exit_date: string | null;
}

export interface DomesticStaffInput {
  name?: string;
  phone?: string;
  category_id?: string;
  unit_ids?: string[];
  [field: string]: unknown;
}

export function useDomesticStaff(id: string) {
  return useQuery({
    queryKey: staffRegisterKeys.domestic(id),
    queryFn: function fetchDomesticStaff() {
      return api.get<{ data: DomesticStaff }>(`/workers/${id}/admin`).then((res) => res.data);
    },
    enabled: Boolean(id),
  });
}

function useStaffInvalidation(): () => void {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: staffKeys.all });
  };
}

export function useCreateDomesticStaff() {
  const invalidate = useStaffInvalidation();
  return useMutation({
    mutationFn: (input: DomesticStaffInput) => api.post<{ data: DomesticStaff }>('/workers/admin', input),
    onSuccess: invalidate,
  });
}

export function useUpdateDomesticStaff() {
  const invalidate = useStaffInvalidation();
  return useMutation({
    mutationFn: (input: { id: string; data: DomesticStaffInput }) => api.patch<{ data: DomesticStaff }>(`/workers/${input.id}`, input.data),
    onSuccess: invalidate,
  });
}

/** STAFF-40's Move to… for household help (PATCH /workers/:id/status). */
export function useChangeDomesticStatus() {
  const invalidate = useStaffInvalidation();
  return useMutation({
    mutationFn: (input: { id: string; status: StaffStatus; reason?: string }) =>
      api.patch<{ data: DomesticStaff }>(`/workers/${input.id}/status`, {
        status: input.status,
        ...(input.reason ? { reason: input.reason } : {}),
      }),
    onSuccess: invalidate,
  });
}
