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
  monthly_charge: number;
  status: string;
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
}

export interface VehicleFilters {
  vehicle_type?: string;
  unit_id?: string;
}

export interface SubletFilters {
  status?: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateSlotInput {
  slot_number: string;
  slot_type: string;
  location?: string | null;
  has_ev_charger?: boolean;
  monthly_charge?: number;
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

function slotFiltersToParams(filters?: SlotFilters): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.slot_type) params.slot_type = filters.slot_type;
  if (filters.status) params.status = filters.status;
  return params;
}

function vehicleFiltersToParams(filters?: VehicleFilters): Record<string, string> | undefined {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.vehicle_type) params.vehicle_type = filters.vehicle_type;
  if (filters.unit_id) params.unit_id = filters.unit_id;
  return params;
}

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
