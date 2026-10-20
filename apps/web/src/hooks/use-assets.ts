'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
//
// AMC contracts have their own hooks (VEND-10): hooks/use-amc-contracts.ts.
//
// Field names here are the API's own (communityos
// `apps/api/src/modules/asset/asset.controller.ts` Zod schemas and the
// rows `asset.service.ts` returns). The API strips unknown body keys
// without complaint, so a renamed field fails silently — check there
// before adding or renaming anything.

export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  /** ASSET-16 — the society's category (absent from an older API, or null before it was linked). */
  category_id?: string | null;
  category_name?: string | null;
  /** ASSET-18 — the asset this one is a part of. */
  parent_asset_id?: string | null;
  parent_name?: string | null;
  /** ASSET-19 — the asset's own depreciation inputs (null = its category's). */
  depreciation_method?: 'slm' | 'wdv' | null;
  depreciation_rate?: string | null;
  useful_life_years?: number | null;
  residual_percent?: string | null;
  depreciation_start_date?: string | null;
  location: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_cost: number;
  warranty_expiry: string;
  condition: string;
  status: string;
  created_at: string;
  /** ASSET-13 — the society's code (AST-0001 … when left blank) and the QR value (the code at creation). */
  asset_code?: string | null;
  qr_code?: string | null;
  site?: string | null;
  building?: string | null;
  wing?: string | null;
  floor?: string | null;
  room?: string | null;
}

export interface ServiceLog {
  id: string;
  asset_id: string;
  asset_name: string;
  service_type: string;
  service_date: string;
  vendor_name: string;
  description: string;
  cost: number;
  next_service_date: string | null;
}

export interface AssetDashboard {
  total_assets: number;
  active_assets: number;
  under_maintenance: number;
  decommissioned: number;
  active_amcs: number;
  expiring_amcs_30d: number;
  overdue_services: number;
}

export interface AssetFilters {
  asset_type?: string;
  status?: string;
  condition?: string;
  /** ASSET-02: name, serial number, location or asset code. */
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const assetKeys = {
  all: ['assets'] as const,
  list: (filters?: AssetFilters) => [...assetKeys.all, 'list', filters] as const,
  detail: (id: string) => [...assetKeys.all, 'detail', id] as const,
  dashboard: () => [...assetKeys.all, 'dashboard'] as const,
  serviceLists: () => [...assetKeys.all, 'services'] as const,
  services: (assetId: string) => [...assetKeys.serviceLists(), assetId] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assetFiltersToParams(
  filters?: AssetFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.asset_type) params.asset_type = filters.asset_type;
  if (filters.status) params.status = filters.status;
  if (filters.condition) params.condition = filters.condition;
  if (filters.search) params.search = filters.search;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useAssets(filters?: AssetFilters) {
  return useQuery({
    queryKey: assetKeys.list(filters),
    queryFn: function fetchAssets() {
      return api.get<PaginatedResponse<Asset>>('/assets', {
        params: assetFiltersToParams(filters),
      });
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: assetKeys.detail(id),
    queryFn: function fetchAsset() {
      return api.get<{ data: Asset }>(`/assets/${id}`).then(function unwrap(res) {
        return res.data;
      });
    },
    enabled: Boolean(id),
  });
}

export function useAssetDashboard() {
  return useQuery({
    queryKey: assetKeys.dashboard(),
    queryFn: function fetchDashboard() {
      return api
        .get<{ data: AssetDashboard }>('/assets/dashboard')
        .then(function unwrap(res) {
          return res.data;
        });
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Fetch service logs for one asset, or for the whole tenant when
 * `assetId` is empty / undefined. Previously the page sent the
 * sentinel `_all` through `/assets/:id/services`, which tripped
 * ParseUUIDPipe (QA #257). The empty-string branch now hits the
 * dedicated `/assets/service-logs` route added for that case.
 */
export function useServiceLogs(assetId: string) {
  return useQuery({
    queryKey: assetKeys.services(assetId || '_all'),
    queryFn: function fetchServiceLogs() {
      const path = assetId
        ? `/assets/${assetId}/services`
        : `/assets/service-logs`;
      return api
        .get<{ data: ServiceLog[] }>(path)
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

interface CreateAssetInput {
  name: string;
  /** An API without categories (ASSET-16) reads the fixed type. */
  asset_type?: string;
  category_id?: string;
  parent_asset_id?: string | null;
  depreciation_method?: 'slm' | 'wdv' | null;
  depreciation_rate?: number | null;
  useful_life_years?: number | null;
  residual_percent?: number | null;
  depreciation_start_date?: string | null;
  location: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  warranty_expiry?: string;
  condition?: string;
}

interface UpdateAssetInput {
  id: string;
  name?: string;
  asset_type?: string;
  category_id?: string;
  parent_asset_id?: string | null;
  depreciation_method?: 'slm' | 'wdv' | null;
  depreciation_rate?: number | null;
  useful_life_years?: number | null;
  residual_percent?: number | null;
  depreciation_start_date?: string | null;
  location?: string;
  manufacturer?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_cost?: number;
  warranty_expiry?: string;
  condition?: string;
  status?: string;
}

interface LogServiceInput {
  asset_id: string;
  service_type: string;
  service_date: string;
  vendor_name?: string;
  description: string;
  cost?: number;
  next_service_date?: string;
}

export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createAsset(input: CreateAssetInput) {
      return api.post<{ data: Asset }>('/assets', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateAsset(input: UpdateAssetInput) {
      const { id, ...body } = input;
      return api.patch<{ data: Asset }>(`/assets/${id}`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
    },
  });
}

export function useLogService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function logService(input: LogServiceInput) {
      const { asset_id, ...body } = input;
      return api.post<{ data: ServiceLog }>(`/assets/${asset_id}/service`, body);
    },
    onSuccess: function invalidate() {
      // The page lists one asset's logs or every asset's (`_all`); the
      // new row belongs in both.
      queryClient.invalidateQueries({ queryKey: assetKeys.serviceLists() });
      queryClient.invalidateQueries({ queryKey: assetKeys.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// Checklists & Audits Types & Hooks
// ---------------------------------------------------------------------------

export interface AssetChecklist {
  id: string;
  name: string;
  area: string;
  items: number;
  /** weekly · monthly · quarterly · half_yearly · yearly; older rows may hold free text or nothing. */
  frequency: string | null;
  last_run: string | null;
  /** Last run + one period (ASSET-06); absent from an older API. */
  next_due?: string | null;
  created_at: string;
}

export interface AuditSchedule {
  id: string;
  checklist_id: string | null;
  checklist: string;
  scheduled_date: string;
  assigned_to: string;
  assigned_to_user_id: string | null;
  assignee_name?: string | null;
  status: string;
}

export interface ConductedAudit {
  id: string;
  schedule_id: string | null;
  checklist: string;
  conducted_on: string;
  conducted_by: string;
  score: number;
  passed: number;
  failed: number;
  status: 'pass' | 'fail' | 'conditional';
  notes: string | null;
}

export interface VendorAudit {
  id: string;
  vendor_id: string;
  vendor_name: string;
  auditor_name: string;
  scheduled_date: string;
  status: string;
  compliance_rating: number | null;
  notes: string | null;
}

export function useAssetChecklists() {
  return useQuery({
    queryKey: ['assets', 'checklists'],
    queryFn: async () => {
      const res = await api.get<{ data: AssetChecklist[] }>('/assets/checklists');
      return res.data;
    },
  });
}

export function useCreateChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; area: string; items?: number; frequency?: string }) =>
      api.post<{ data: AssetChecklist }>('/assets/checklists', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'checklists'] }),
  });
}

export function useAuditSchedules() {
  return useQuery({
    queryKey: ['assets', 'audit-schedules'],
    queryFn: async () => {
      const res = await api.get<{ data: AuditSchedule[] }>('/assets/audits/schedules');
      return res.data;
    },
  });
}

export function useCreateAuditSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { checklist_id?: string; checklist: string; scheduled_date: string; assigned_to?: string; assigned_to_user_id?: string }) =>
      api.post<{ data: AuditSchedule }>('/assets/audits/schedules', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'audit-schedules'] }),
  });
}

export function useConductedAudits() {
  return useQuery({
    queryKey: ['assets', 'conducted-audits'],
    queryFn: async () => {
      const res = await api.get<{ data: ConductedAudit[] }>('/assets/audits/conducted');
      return res.data;
    },
  });
}

export function useRecordConductedAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      schedule_id?: string;
      checklist: string;
      conducted_on?: string;
      conducted_by: string;
      score?: number;
      passed?: number;
      failed?: number;
      status?: 'pass' | 'fail' | 'conditional';
      notes?: string;
    }) => api.post<{ data: ConductedAudit }>('/assets/audits/conducted', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets', 'conducted-audits'] });
      qc.invalidateQueries({ queryKey: ['assets', 'audit-schedules'] });
    },
  });
}

export function useVendorAudits() {
  return useQuery({
    queryKey: ['assets', 'vendor-audits'],
    queryFn: async () => {
      const res = await api.get<{ data: VendorAudit[] }>('/assets/audits/vendor');
      return res.data;
    },
  });
}

export function useCreateVendorAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { vendor_id: string; auditor_name: string; scheduled_date: string; compliance_rating?: number; notes?: string }) =>
      api.post<{ data: VendorAudit }>('/assets/audits/vendor', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets', 'vendor-audits'] }),
  });
}
