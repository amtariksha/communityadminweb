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

export interface Visitor {
  id: string;
  tenant_id: string;
  unit_id: string;
  unit_number?: string;
  visitor_name: string;
  visitor_phone: string | null;
  purpose: string | null;
  vehicle_number: string | null;
  otp_code: string | null;
  pre_approved: boolean;
  expected_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  status: 'pending' | 'approved' | 'checked_in' | 'checked_out' | 'rejected' | 'expired';
  created_by: string | null;
  created_by_name?: string;
  created_at: string;
}

export interface StaffLog {
  id: string;
  tenant_id: string;
  staff_name: string;
  staff_type: string;
  phone: string | null;
  unit_id: string | null;
  unit_number?: string;
  check_in_at: string;
  check_out_at: string | null;
  notes: string | null;
  logged_by: string | null;
  logged_by_name?: string;
  created_at: string;
}

export interface Parcel {
  id: string;
  tenant_id: string;
  unit_id: string;
  unit_number?: string;
  courier_name: string | null;
  tracking_number: string | null;
  description: string | null;
  received_at: string;
  collected_at: string | null;
  collected_by: string | null;
  status: 'received' | 'notified' | 'collected';
  received_by: string | null;
  received_by_name?: string;
  created_at: string;
}

export interface GateStats {
  visitors_today: number;
  visitors_checked_in: number;
  // Alias for `visitors_checked_in` returned by older API versions.
  currently_inside?: number;
  staff_checked_in: number;
  parcels_pending: number;
  visitors_this_week: number;
}

export interface AnprLog {
  id: string;
  plate_number: string;
  gate_id: string;
  gate_name?: string;
  direction: 'in' | 'out';
  is_recognized: boolean;
  image_url: string | null;
  timestamp: string;
  vehicle_owner?: string;
  unit_number?: string;
}

export interface UnrecognizedVehicle {
  id: string;
  plate_number: string;
  gate_name: string;
  image_url: string | null;
  timestamp: string;
  occurrence_count: number;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface VisitorFilters {
  status?: string;
  unit_id?: string;
  date?: string;
  page?: number;
  limit?: number;
}

export interface MyVisitorFilters {
  status?: string;
  page?: number;
  limit?: number;
}

export interface StaffLogFilters {
  date?: string;
  staff_type?: string;
  page?: number;
  limit?: number;
}

export interface ParcelFilters {
  unit_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AnprLogFilters {
  gate_id?: string;
  from_date?: string;
  to_date?: string;
  is_recognized?: boolean;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateVisitorInput {
  unit_id: string;
  visitor_name: string;
  visitor_phone?: string;
  purpose?: string;
  vehicle_number?: string;
  pre_approved?: boolean;
  expected_at?: string;
  gate_id?: string;
}

interface WalkInVisitorInput {
  unit_id: string;
  visitor_name: string;
  visitor_phone?: string;
  purpose?: string;
  vehicle_number?: string;
}

interface VerifyOtpInput {
  id: string;
  otp: string;
}

interface StaffCheckInInput {
  staff_name: string;
  staff_type: string;
  phone?: string;
  unit_id?: string;
  notes?: string;
}

interface CreateParcelInput {
  unit_id: string;
  courier_name?: string;
  tracking_number?: string;
  description?: string;
}

interface CollectParcelInput {
  id: string;
  // Migration 055 split the legacy `collected_by` into `collected_by_user_id`
  // (preferred — picks a member from the directory) and `collected_by_name`
  // (free-text fallback for non-registered collectors). Backend Zod schema
  // rejects payloads that have neither (QA #224 — was sending `collected_by`
  // which the server silently dropped, surfacing as "Validation failed").
  collected_by_user_id?: string;
  collected_by_name?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const gateKeys = {
  all: ['gate'] as const,
  stats: () => [...gateKeys.all, 'stats'] as const,
  visitors: () => [...gateKeys.all, 'visitors'] as const,
  visitorList: (filters?: VisitorFilters) => [...gateKeys.visitors(), 'list', filters] as const,
  myVisitors: (filters?: MyVisitorFilters) => [...gateKeys.visitors(), 'my', filters] as const,
  staffLogs: () => [...gateKeys.all, 'staff-logs'] as const,
  staffLogList: (filters?: StaffLogFilters) => [...gateKeys.staffLogs(), 'list', filters] as const,
  parcels: () => [...gateKeys.all, 'parcels'] as const,
  parcelList: (filters?: ParcelFilters) => [...gateKeys.parcels(), 'list', filters] as const,
  anpr: () => [...gateKeys.all, 'anpr'] as const,
  anprLogs: (filters?: AnprLogFilters) => [...gateKeys.anpr(), 'logs', filters] as const,
  unrecognizedVehicles: () => [...gateKeys.anpr(), 'unrecognized'] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function visitorFiltersToParams(
  filters?: VisitorFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.date) params.date = filters.date;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

function myVisitorFiltersToParams(
  filters?: MyVisitorFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

function staffLogFiltersToParams(
  filters?: StaffLogFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.date) params.date = filters.date;
  if (filters.staff_type) params.staff_type = filters.staff_type;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

function parcelFiltersToParams(
  filters?: ParcelFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.unit_id) params.unit_id = filters.unit_id;
  if (filters.status) params.status = filters.status;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useGateStats() {
  return useQuery({
    queryKey: gateKeys.stats(),
    queryFn: function fetchGateStats() {
      return api.get<{ data: GateStats }>('/gate/stats').then(function unwrap(res) {
        return res.data;
      });
    },
    staleTime: 30 * 1000,
  });
}

export function useVisitors(filters?: VisitorFilters) {
  return useQuery({
    queryKey: gateKeys.visitorList(filters),
    queryFn: function fetchVisitors() {
      return api.get<PaginatedResponse<Visitor>>('/gate/visitors', {
        params: visitorFiltersToParams(filters),
      });
    },
  });
}

export function useMyVisitors(filters?: MyVisitorFilters) {
  return useQuery({
    queryKey: gateKeys.myVisitors(filters),
    queryFn: function fetchMyVisitors() {
      return api.get<PaginatedResponse<Visitor>>('/gate/visitors/my', {
        params: myVisitorFiltersToParams(filters),
      });
    },
  });
}

export function useStaffLogs(filters?: StaffLogFilters) {
  return useQuery({
    queryKey: gateKeys.staffLogList(filters),
    queryFn: function fetchStaffLogs() {
      return api.get<PaginatedResponse<StaffLog>>('/gate/staff/logs', {
        params: staffLogFiltersToParams(filters),
      });
    },
  });
}

export function useParcels(filters?: ParcelFilters) {
  return useQuery({
    queryKey: gateKeys.parcelList(filters),
    queryFn: function fetchParcels() {
      return api.get<PaginatedResponse<Parcel>>('/gate/parcels', {
        params: parcelFiltersToParams(filters),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Queries — ANPR / Vehicles
// ---------------------------------------------------------------------------

function anprFiltersToParams(
  filters?: AnprLogFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.gate_id) params.gate_id = filters.gate_id;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  if (filters.is_recognized !== undefined) params.is_recognized = String(filters.is_recognized);
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

export function useAnprLogs(filters?: AnprLogFilters) {
  return useQuery({
    queryKey: gateKeys.anprLogs(filters),
    queryFn: function fetchAnprLogs() {
      return api.get<PaginatedResponse<AnprLog>>('/gate/anpr/logs', {
        params: anprFiltersToParams(filters),
      });
    },
  });
}

/**
 * Admin-panel manual plate scan for testing ANPR quality without a
 * Flutter guard device. Reads the image, base64-encodes it, hits the
 * /gate/anpr/scan endpoint, and returns the plate. The scan also logs
 * into `vehicle_logs` server-side so it appears in the useAnprLogs
 * list right after.
 */
export function useAnprScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async function scanPlate(input: {
      file: File;
      direction: 'entry' | 'exit';
      gate_id?: string;
    }): Promise<{
      plate_number: string;
      confidence: number;
      is_recognized: boolean;
      matched_vehicle_id: string | null;
      vehicle_log_id: string;
    }> {
      const image = await fileToBase64(input.file);
      const res = await api.post<{
        data: {
          plate_number: string;
          confidence: number;
          is_recognized: boolean;
          matched_vehicle_id: string | null;
          vehicle_log_id: string;
        };
      }>('/gate/anpr/scan', {
        image_base64: image,
        mime_type: input.file.type || 'image/jpeg',
        direction: input.direction,
        ...(input.gate_id ? { gate_id: input.gate_id } : {}),
      });
      return res.data;
    },
    onSuccess: function invalidate() {
      // Refresh the Vehicle Logs table so the just-scanned row shows up.
      queryClient.invalidateQueries({ queryKey: gateKeys.anprLogs() });
    },
  });
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function useUnrecognizedVehicles() {
  return useQuery({
    queryKey: gateKeys.unrecognizedVehicles(),
    queryFn: function fetchUnrecognized() {
      return api
        .get<{ data: UnrecognizedVehicle[] }>('/gate/anpr/unrecognized')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Visitors
// ---------------------------------------------------------------------------

export function useCreateVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createVisitor(input: CreateVisitorInput) {
      return api.post<{ data: Visitor }>('/gate/visitors', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.visitors() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

export function useWalkInVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function walkInVisitor(input: WalkInVisitorInput) {
      return api.post<{ data: Visitor }>('/gate/visitors/walk-in', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.visitors() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

export function useVerifyVisitorOtp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function verifyVisitorOtp(input: VerifyOtpInput) {
      return api.post<{ data: Visitor }>(`/gate/visitors/${input.id}/verify-otp`, {
        otp: input.otp,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.visitors() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

export function useCheckInVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function checkInVisitor(id: string) {
      return api.patch<{ data: Visitor }>(`/gate/visitors/${id}/check-in`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.visitors() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

export function useCheckOutVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function checkOutVisitor(id: string) {
      return api.patch<{ data: Visitor }>(`/gate/visitors/${id}/check-out`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.visitors() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

export function useCancelVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelVisitor(id: string) {
      return api.patch<{ data: Visitor }>(`/gate/visitors/${id}/cancel`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.visitors() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Staff
// ---------------------------------------------------------------------------

export function useStaffCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function staffCheckIn(input: StaffCheckInInput) {
      return api.post<{ data: StaffLog }>('/gate/staff/check-in', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.staffLogs() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

export function useStaffCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function staffCheckOut(id: string) {
      return api.patch<{ data: StaffLog }>(`/gate/staff/${id}/check-out`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.staffLogs() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations — Parcels
// ---------------------------------------------------------------------------

export function useCreateParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createParcel(input: CreateParcelInput) {
      return api.post<{ data: Parcel }>('/gate/parcels', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.parcels() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}

export function useCollectParcel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function collectParcel(input: CollectParcelInput) {
      return api.patch<{ data: Parcel }>(`/gate/parcels/${input.id}/collect`, {
        collected_by_user_id: input.collected_by_user_id,
        collected_by_name: input.collected_by_name,
      });
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: gateKeys.parcels() });
      queryClient.invalidateQueries({ queryKey: gateKeys.stats() });
    },
  });
}
