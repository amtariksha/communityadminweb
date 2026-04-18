'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface Meter {
  id: string;
  tenant_id: string;
  /** NULL when is_common=true (society-wide meter). */
  unit_id: string | null;
  is_common: boolean;
  meter_type: 'water' | 'electricity' | 'gas';
  meter_number: string;
  is_active: boolean;
  created_at: string;
  unit_number?: string;
}

export interface Reading {
  id: string;
  tenant_id: string;
  meter_id: string;
  reading_value: number;
  reading_date: string;
  previous_reading: number | null;
  consumption: number | null;
  reading_image_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Slab {
  id: string;
  tenant_id: string;
  meter_type: 'water' | 'electricity' | 'gas';
  slab_from: number;
  slab_to: number | null;
  rate_per_unit: number;
  effective_from: string;
  effective_to: string | null;
  label: string | null;
  minimum_charge: number;
  created_at: string;
}

export interface UtilityBill {
  id: string;
  tenant_id: string;
  unit_id: string;
  meter_id: string;
  period_from: string;
  period_to: string;
  consumption: number;
  amount: number;
  status: 'pending' | 'invoiced' | 'paid';
  invoice_id: string | null;
  reading_id: string | null;
  created_at: string;
  meter_number?: string;
  meter_type?: string;
  unit_number?: string;
}

export interface UtilityStats {
  total_meters: number;
  active_meters: number;
  by_type: Record<string, { meters: number; pending_bills: number; total_billed: number }>;
  total_pending_bills: number;
  total_billed_amount: number;
  unbilled_readings: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface MeterFilters {
  unit_id?: string;
  meter_type?: string;
}

export interface BillFilters {
  unit_id?: string;
  meter_type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateMeterInput {
  unit_id: string | null;
  is_common?: boolean;
  meter_type: 'water' | 'electricity' | 'gas';
  meter_number: string;
}

interface UpdateMeterInput {
  id: string;
  meter_number?: string;
  is_active?: boolean;
}

interface SubmitReadingInput {
  meter_id: string;
  reading_value: number;
  reading_date: string;
  reading_image_url?: string | null;
}

interface BulkReadingsInput {
  readings: Array<{
    meter_number: string;
    reading_value: number;
    reading_date: string;
  }>;
}

interface CreateSlabInput {
  meter_type: 'water' | 'electricity' | 'gas';
  slab_from: number;
  slab_to?: number | null;
  rate_per_unit: number;
  effective_from: string;
  effective_to?: string | null;
  label?: string | null;
  minimum_charge?: number;
}

interface UpdateSlabInput {
  id: string;
  slab_from?: number;
  slab_to?: number | null;
  rate_per_unit?: number;
  effective_from?: string;
  effective_to?: string | null;
  label?: string | null;
  minimum_charge?: number;
}

interface CalculateBillsInput {
  meter_type: 'water' | 'electricity' | 'gas';
  period_from: string;
  period_to: string;
}

interface BillToInvoiceInput {
  bill_id: string;
  ledger_account_id: string;
  invoice_date: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const utilityKeys = {
  all: ['utilities'] as const,
  stats: () => [...utilityKeys.all, 'stats'] as const,
  meters: () => [...utilityKeys.all, 'meters'] as const,
  meterList: (filters?: MeterFilters) => [...utilityKeys.meters(), filters] as const,
  readings: () => [...utilityKeys.all, 'readings'] as const,
  readingList: (meterId: string) => [...utilityKeys.readings(), meterId] as const,
  slabs: () => [...utilityKeys.all, 'slabs'] as const,
  slabList: (meterType?: string) => [...utilityKeys.slabs(), meterType] as const,
  bills: () => [...utilityKeys.all, 'bills'] as const,
  billList: (filters?: BillFilters) => [...utilityKeys.bills(), filters] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function meterFiltersToParams(filters?: MeterFilters): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.meter_type) params.meter_type = filters.meter_type;
  return params;
}

function billFiltersToParams(filters?: BillFilters): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.meter_type) params.meter_type = filters.meter_type;
  if (filters.status) params.status = filters.status;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useUtilityStats() {
  return useQuery({
    queryKey: utilityKeys.stats(),
    queryFn: function fetchStats() {
      return api
        .get<{ data: UtilityStats }>('/utilities/stats')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useMeters(filters?: MeterFilters) {
  return useQuery({
    queryKey: utilityKeys.meterList(filters),
    queryFn: function fetchMeters() {
      return api
        .get<{ data: Meter[] }>('/utilities/meters', {
          params: meterFiltersToParams(filters),
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useReadings(meterId: string) {
  return useQuery({
    queryKey: utilityKeys.readingList(meterId),
    queryFn: function fetchReadings() {
      return api.get<PaginatedResponse<Reading>>(
        `/utilities/readings/${meterId}`,
      );
    },
    enabled: meterId !== '',
  });
}

export function useSlabs(meterType?: string) {
  return useQuery({
    queryKey: utilityKeys.slabList(meterType),
    queryFn: function fetchSlabs() {
      return api
        .get<{ data: Slab[] }>('/utilities/slabs', {
          params: meterType ? { meter_type: meterType } : undefined,
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useUtilityBills(filters?: BillFilters) {
  return useQuery({
    queryKey: utilityKeys.billList(filters),
    queryFn: function fetchBills() {
      return api.get<PaginatedResponse<UtilityBill>>('/utilities/bills', {
        params: billFiltersToParams(filters),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateMeter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createMeter(input: CreateMeterInput) {
      return api.post<{ data: Meter }>('/utilities/meters', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.meters() });
      queryClient.invalidateQueries({ queryKey: utilityKeys.stats() });
    },
  });
}

export function useUpdateMeter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateMeter({ id, ...body }: UpdateMeterInput) {
      return api.patch<{ data: Meter }>(`/utilities/meters/${id}`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.meters() });
      queryClient.invalidateQueries({ queryKey: utilityKeys.stats() });
    },
  });
}

export function useSubmitReading() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function submitReading(input: SubmitReadingInput) {
      return api.post<{ data: Reading }>('/utilities/readings', input);
    },
    onSuccess: function invalidate(_data, variables) {
      queryClient.invalidateQueries({
        queryKey: utilityKeys.readingList(variables.meter_id),
      });
      queryClient.invalidateQueries({ queryKey: utilityKeys.stats() });
    },
  });
}

export function useSubmitBulkReadings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function submitBulkReadings(input: BulkReadingsInput) {
      return api.post<{
        data: { submitted: number; skipped: number; errors: string[] };
      }>('/utilities/readings/bulk', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.readings() });
      queryClient.invalidateQueries({ queryKey: utilityKeys.stats() });
    },
  });
}

export function useCreateSlab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createSlab(input: CreateSlabInput) {
      return api.post<{ data: Slab }>('/utilities/slabs', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.slabs() });
    },
  });
}

export function useUpdateSlab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateSlab({ id, ...body }: UpdateSlabInput) {
      return api.patch<{ data: Slab }>(`/utilities/slabs/${id}`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.slabs() });
    },
  });
}

export function useDeleteSlab() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deleteSlab(id: string) {
      return api.delete(`/utilities/slabs/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.slabs() });
    },
  });
}

export function useCalculateBills() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function calculateBills(input: CalculateBillsInput) {
      return api.post<{ data: { bills: UtilityBill[]; count: number } }>(
        '/utilities/calculate',
        input,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.bills() });
      queryClient.invalidateQueries({ queryKey: utilityKeys.stats() });
    },
  });
}

export function useBillToInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function billToInvoice({
      bill_id,
      ...body
    }: BillToInvoiceInput) {
      return api.post<{
        data: { invoice_id: string; invoice_number: string };
      }>(`/utilities/bills/${bill_id}/invoice`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: utilityKeys.bills() });
      queryClient.invalidateQueries({ queryKey: utilityKeys.stats() });
    },
  });
}
