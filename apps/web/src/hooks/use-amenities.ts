'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface Amenity {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  location: string | null;
  capacity: number | null;
  pricing_type: string;
  price: number;
  deposit: number;
  rules: string | null;
  time_slots: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AmenitySlot {
  id: string;
  amenity_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  booked_by: string | null;
  booking_id: string | null;
}

export interface AmenityBooking {
  id: string;
  tenant_id: string;
  amenity_id: string;
  member_id: string;
  unit_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  amount: number;
  deposit: number;
  notes: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  amenity_name?: string;
  member_name?: string;
  unit_number?: string;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface AmenityBookingFilters {
  amenity_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

interface CreateAmenityInput {
  name: string;
  amenity_type?: string;
  location?: string | null;
  capacity?: number | null;
  pricing_type?: string;
  price_per_unit?: number;
  deposit_amount?: number;
  rules?: string | null;
  description?: string | null;
}

interface UpdateAmenityInput {
  id: string;
  name?: string;
  amenity_type?: string;
  location?: string | null;
  capacity?: number | null;
  pricing_type?: string;
  price_per_unit?: number;
  deposit_amount?: number;
  rules?: string | null;
  description?: string | null;
  is_active?: boolean;
}

interface CreateBookingInput {
  amenity_id: string;
  date: string;
  start_time: string;
  end_time: string;
  member_id: string;
  unit_id: string;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const amenityKeys = {
  all: ['amenities'] as const,
  lists: () => [...amenityKeys.all, 'list'] as const,
  list: () => [...amenityKeys.lists()] as const,
  slots: () => [...amenityKeys.all, 'slots'] as const,
  slotList: (amenityId: string, date: string) =>
    [...amenityKeys.slots(), amenityId, date] as const,
  bookings: () => [...amenityKeys.all, 'bookings'] as const,
  bookingList: (filters?: AmenityBookingFilters) =>
    [...amenityKeys.bookings(), filters] as const,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bookingFiltersToParams(
  filters?: AmenityBookingFilters,
): Record<string, string> | undefined {
  if (!filters) return undefined;

  const params: Record<string, string> = {};
  if (filters.amenity_id) params.amenity_id = filters.amenity_id;
  if (filters.status) params.status = filters.status;
  if (filters.date_from) params.date_from = filters.date_from;
  if (filters.date_to) params.date_to = filters.date_to;
  if (filters.page !== undefined) params.page = String(filters.page);
  if (filters.limit !== undefined) params.limit = String(filters.limit);
  return params;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useAmenities() {
  return useQuery({
    queryKey: amenityKeys.list(),
    queryFn: function fetchAmenities() {
      return api
        .get<{ data: Amenity[] }>('/amenities')
        .then(function unwrap(res) {
          return res.data;
        });
    },
  });
}

export function useAmenitySlots(amenityId: string, date: string) {
  return useQuery({
    queryKey: amenityKeys.slotList(amenityId, date),
    queryFn: function fetchAmenitySlots() {
      return api
        .get<{ data: AmenitySlot[] }>(`/amenities/${amenityId}/slots`, {
          params: { date },
        })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: amenityId !== '' && date !== '',
  });
}

export function useAmenityBookings(filters?: AmenityBookingFilters) {
  return useQuery({
    queryKey: amenityKeys.bookingList(filters),
    queryFn: function fetchAmenityBookings() {
      return api
        .get<{ data: AmenityBooking[]; total: number }>('/amenities/bookings', {
          params: bookingFiltersToParams(filters),
        })
        .then(function unwrap(res) {
          return res;
        });
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function useCreateAmenity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createAmenity(input: CreateAmenityInput) {
      return api.post<{ data: Amenity }>('/amenities', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}

export function useUpdateAmenity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function updateAmenity({ id, ...body }: UpdateAmenityInput) {
      return api.patch<{ data: Amenity }>(`/amenities/${id}`, body);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function createBooking(input: CreateBookingInput) {
      return api.post<{ data: AmenityBooking }>('/amenities/bookings', input);
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelBooking(input: { id: string; reason?: string }) {
      return api.post<{ data: AmenityBooking }>(
        `/amenities/bookings/${input.id}/cancel`,
        { reason: input.reason },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}
