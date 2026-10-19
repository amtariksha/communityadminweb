'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface ParkingSlot {
  id: string;
  slot_number: string;
  slot_type: string;
  location: string | null;
  unit_id: string | null;
  assigned_to_member_id: string | null;
  has_ev_charger: boolean;
  is_occupied: boolean;
  status: string;
  sticker_number?: string | null;
  rfid_tag?: string | null;
  is_ev_enabled?: boolean;
  created_at: string;
  unit_number?: string;
  member_name?: string;
}

export interface Vehicle {
  id: string;
  member_id: string;
  unit_id: string;
  registration_number: string;
  vehicle_type: string;
  make: string | null;
  model: string | null;
  color: string | null;
  parking_slot_id: string | null;
  sticker_number: string | null;
  is_active: boolean;
  created_at: string;
  member_name?: string;
  unit_number?: string;
  slot_number?: string;
  // PARK-02 — from the list: the unit's block, the slot's type and the
  // register status (absent from an API built before PARK-02).
  block?: string | null;
  slot_type?: string | null;
  register_status?: VehicleRegisterStatus;
  // FeatPlan #OW-3 — approval workflow. POST /vehicles defaults to
  // approval_status='pending' + is_active=false; community_admin /
  // committee_member must PATCH approve to flip is_active=true.
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by_user_id?: string | null;
  approved_at?: string | null;
}

export interface ParkingSublet {
  id: string;
  parking_slot_id: string;
  owner_member_id: string;
  sublettee_member_id: string;
  start_date: string;
  end_date: string | null;
  monthly_charge: number;
  status: string;
  created_at: string;
  slot_number?: string;
  owner_name?: string;
  sublettee_name?: string;
}

export interface SlotStats {
  total: number;
  assigned: number;
  vacant: number;
  sublet: number;
  ev_enabled: number;
  by_type: Record<string, { total: number; assigned: number; vacant: number }>;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface SlotFilters {
  slot_type?: string;
  status?: string;
  /** Slot number or location. */
  search?: string;
  page?: number;
  limit?: number;
}

/** GET /parking/vehicles `status` (PARK-02); none = in use and awaiting approval. */
export type VehicleRegisterStatus = 'pending' | 'active' | 'expired' | 'rejected' | 'removed';

export interface VehicleFilters {
  vehicle_type?: string;
  unit_id?: string;
  /** Plate, sticker, member name or unit number. */
  search?: string;
  block?: string;
  status?: VehicleRegisterStatus;
  page?: number;
  limit?: number;
  // FeatPlan #OW-3 — when set, the backend (parking.controller.ts:191)
  // bypasses the legacy is_active=true predicate and selects rows by
  // approval_status. Use 'pending' to populate the approval queue.
  approval_status?: 'pending' | 'approved' | 'rejected';
}

export interface SubletFilters {
  status?: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateSlotInput {
  slot_number: string;
  slot_type: string;
  location?: string | null;
  has_ev_charger?: boolean;
  sticker_number?: string | null;
  rfid_tag?: string | null;
  is_ev_enabled?: boolean;
}

interface BulkCreateSlotsInput {
  slots: CreateSlotInput[];
}

interface AssignSlotInput {
  id: string;
  unit_id: string;
  member_id?: string;
}

interface RegisterVehicleInput {
  registration_number: string;
  vehicle_type: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  member_id: string;
  unit_id: string;
  parking_slot_id?: string | null;
  sticker_number?: string | null;
}

interface UpdateVehicleInput {
  id: string;
  registration_number?: string;
  vehicle_type?: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  parking_slot_id?: string | null;
  sticker_number?: string | null;
  is_active?: boolean;
}

// QA #357-admin — sublet creation. Schema mirrors backend's
// createSubletSchema (parking.controller.ts). The slot_id is the
// parking SLOT being sublet (not a vehicle); the sublettee_member_id
// receives the slot for the date range. monthly_charge defaults to 0
// at the backend if omitted.
export interface CreateSubletInput {
  parking_slot_id: string;
  sublettee_member_id: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string;  // YYYY-MM-DD optional
  monthly_charge?: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const parkingKeys = {
  all: ['parking'] as const,
  slots: () => [...parkingKeys.all, 'slots'] as const,
  slotList: (filters?: SlotFilters) => [...parkingKeys.slots(), filters] as const,
  stats: () => [...parkingKeys.all, 'stats'] as const,
  vehicles: () => [...parkingKeys.all, 'vehicles'] as const,
  vehicleList: (filters?: VehicleFilters) => [...parkingKeys.vehicles(), filters] as const,
  sublets: () => [...parkingKeys.all, 'sublets'] as const,
  subletList: (filters?: SubletFilters) => [...parkingKeys.sublets(), filters] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Query-string params from a filter object: blank values are left out,
// numbers become strings.
function toParams(filters?: object): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params[key] = String(value);
  }
  return params;
}

/** The slot and vehicle list filters as GET params (also the export's). */
export function slotFiltersToParams(filters?: SlotFilters): Record<string, string> | undefined {
  return toParams(filters);
}

export function vehicleFiltersToParams(filters?: VehicleFilters): Record<string, string> | undefined {
  return toParams(filters);
}

/** Pickers load the whole slot list (GET /parking/slots allows up to 1,000). */
export const SLOT_PICKER_LIMIT = 1000;

function subletFiltersToParams(filters?: SubletFilters): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.status) params.status = filters.status;
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useSlots(filters?: SlotFilters) {
  return useQuery({
    queryKey: parkingKeys.slotList(filters),
    queryFn: function fetchSlots() {
      return api
        .get<{ data: ParkingSlot[] }>('/parking/slots', {
          params: slotFiltersToParams(filters),
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

/** One page of the slot list with its total (PARK-02). */
export function useSlotPage(filters: SlotFilters) {
  return useQuery({
    queryKey: [...parkingKeys.slotList(filters), 'page'] as const,
    queryFn: function fetchSlotPage() {
      return api.get<{ data: ParkingSlot[]; total: number }>('/parking/slots', {
        params: slotFiltersToParams(filters),
      });
    },
  });
}

/** One page of the vehicle register with its total (PARK-02). */
export function useVehiclePage(filters: VehicleFilters) {
  return useQuery({
    queryKey: [...parkingKeys.vehicleList(filters), 'page'] as const,
    queryFn: function fetchVehiclePage() {
      return api.get<{ data: Vehicle[]; total: number }>('/parking/vehicles', {
        params: vehicleFiltersToParams(filters),
      });
    },
  });
}

export function useSlotStats() {
  return useQuery({
    queryKey: parkingKeys.stats(),
    queryFn: function fetchSlotStats() {
      return api
        .get<{ data: SlotStats }>('/parking/slots/stats')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useVehicles(filters?: VehicleFilters) {
  return useQuery({
    queryKey: parkingKeys.vehicleList(filters),
    queryFn: function fetchVehicles() {
      return api
        .get<{ data: Vehicle[] }>('/parking/vehicles', {
          params: vehicleFiltersToParams(filters),
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useSublets(filters?: SubletFilters) {
  return useQuery({
    queryKey: parkingKeys.subletList(filters),
    queryFn: function fetchSublets() {
      return api
        .get<{ data: ParkingSublet[] }>('/parking/sublets', {
          params: subletFiltersToParams(filters),
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createSlot(input: CreateSlotInput) {
      return api.post<{ data: ParkingSlot }>('/parking/slots', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useUpdateSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateSlotFn({ id, data }: { id: string; data: Partial<CreateSlotInput> }) {
      return api.patch<{ data: ParkingSlot }>(`/parking/slots/${id}`, data);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useBulkCreateSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function bulkCreateSlots(input: BulkCreateSlotsInput) {
      return api.post<{ data: { created: number } }>('/parking/slots/bulk', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useAssignSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function assignSlot({ id, ...body }: AssignSlotInput) {
      return api.post<{ data: ParkingSlot }>(`/parking/slots/${id}/assign`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useDeallocateSlot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function deallocateSlot(id: string) {
      return api.post<{ data: ParkingSlot }>(`/parking/slots/${id}/deallocate`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useRegisterVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function registerVehicle(input: RegisterVehicleInput) {
      return api.post<{ data: Vehicle }>('/parking/vehicles', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateVehicle({ id, ...body }: UpdateVehicleInput) {
      return api.patch<{ data: Vehicle }>(`/parking/vehicles/${id}`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useRemoveVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function removeVehicle(id: string) {
      return api.delete(`/parking/vehicles/${id}`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

// QA #357-admin — create a parking sublet.
// Backend POST /parking/sublets accepts the CreateSubletInput
// shape; returns the inserted parking_sublets row. The slot
// transitions to 'sublet' status server-side once the approval
// (if any) lands; the inserted row starts as 'pending' or
// 'active' depending on the tenant's approval policy.
export function useCreateSublet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createSublet(input: CreateSubletInput) {
      return api.post<{ data: ParkingSublet }>('/parking/sublets', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

// QA #357-admin — cancel a sublet. Backend POST
// /parking/sublets/:id/cancel only acts on pending|active rows;
// it 4xxs on already-cancelled / completed.
export function useCancelSublet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelSublet(id: string) {
      return api.post<{ data: ParkingSublet }>(`/parking/sublets/${id}/cancel`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

// FeatPlan #OW-3 — approve / reject a pending vehicle. Backend
// (parking.controller.ts:234, 249) gates both endpoints to
// community_admin / committee_member / super_admin.
//
// Approve flips approval_status='approved' + is_active=true. After
// approval the vehicle returns from the standard `useVehicles` query
// (which still filters is_active=true unless approval_status is
// passed). Reject pins approval_status='rejected' + the reason in
// metadata for audit; row stays for history.

export function useApproveVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function approveVehicle(id: string) {
      return api.patch<{ data: Vehicle }>(`/parking/vehicles/${id}/approve`);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}

export function useRejectVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: function rejectVehicle(input: { id: string; reason: string }) {
      return api.patch<{ data: Vehicle }>(
        `/parking/vehicles/${input.id}/reject`,
        { reason: input.reason },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: parkingKeys.all });
    },
  });
}
