'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AmenityBooking } from './use-amenities';

/**
 * Amenity & Event › Amenity Reservations (AMEN-11): bookings fetched by
 * amenity, state and dates, with a count of every state (SB-04 counts).
 */

export type ReservationStatus = 'awaiting_payment' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface AmenityReservation extends AmenityBooking {
  block?: string | null;
  /** From the booking's invoice, when it has one. */
  invoice_total?: number | string | null;
  invoice_paid?: number | string | null;
  invoice_balance?: number | string | null;
}

export interface ReservationList {
  data: AmenityReservation[];
  total: number;
  /** Absent on an API from before AMEN-11. */
  counts?: Partial<Record<ReservationStatus, number>>;
}

export interface ReservationFilters {
  amenityId: string;
  status: ReservationStatus;
  dateFrom: string;
  dateTo: string;
}

/** The list's and the export's query (same filters, SB-04). */
export function reservationParams(filters: ReservationFilters): Record<string, string> {
  const params: Record<string, string> = { status: filters.status };
  if (filters.amenityId) params.amenity_id = filters.amenityId;
  if (filters.dateFrom) params.date_from = filters.dateFrom;
  if (filters.dateTo) params.date_to = filters.dateTo;
  return params;
}

export function useAmenityReservations(filters: ReservationFilters, page: number, limit: number, enabled = true) {
  return useQuery({
    queryKey: ['amenities', 'reservations', filters, page, limit] as const,
    enabled,
    placeholderData: keepPreviousData,
    queryFn: function fetchReservations({ signal }) {
      return api.get<ReservationList>('/amenities/bookings', {
        params: { ...reservationParams(filters), page: String(page), limit: String(limit) },
        signal,
      });
    },
  });
}
