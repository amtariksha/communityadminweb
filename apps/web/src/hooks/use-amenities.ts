'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

// Backend returns the raw `amenities` row shape (migration 026):
//   amenity_type, price_per_unit, deposit_amount.
// Earlier interface declared `type / price / deposit` which silently
// resolved to `undefined` at runtime — every list cell + form
// hydration read undefined, so saved edits never reflected (the
// PATCH did persist, but the next render showed stale values).
// Field names now match the wire contract verbatim.
export interface Amenity {
  id: string;
  tenant_id: string;
  name: string;
  amenity_type: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  pricing_type: string;
  price_per_unit: number;
  deposit_amount: number;
  rules: string | null;
  // Legacy field — current backend doesn't return this column on the
  // amenities row (slot rows live in `amenity_slots` and are fetched
  // via /amenities/:id/slots). Kept nullable so the settings page's
  // hydration `amenity.time_slots ?? ''` doesn't crash; will be
  // `undefined` at runtime today.
  time_slots?: string | null;
  is_active: boolean;
  /** AMEN-21 — the income account its invoices credit; absent on an older API. */
  income_account_id?: string | null;
  income_account_name?: string | null;
  /** AMEN-22 — terms the booker accepts (sanitised HTML), booking over several days. */
  terms_enabled?: boolean;
  terms_text?: string | null;
  allow_multi_day?: boolean;
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

// Backend BookingRow (amenity.service.ts:46) returns the raw
// amenity_bookings columns: booking_date / total_amount /
// deposit_amount / purpose. The earlier interface declared
// `date / amount / deposit / notes` — those resolved to undefined
// at runtime, which silently broke calendar grouping
// (`booking.date.slice(0, 10)` threw) + suppressed the deposit /
// notes display. Field names now match the wire contract.
export interface AmenityBooking {
  id: string;
  tenant_id: string;
  amenity_id: string;
  member_id: string;
  unit_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  total_amount: number;
  deposit_amount: number;
  guests_count?: number;
  purpose: string | null;
  created_at: string;
  amenity_name?: string;
  member_name?: string;
  unit_number?: string;
  invoice_id?: string | null;
  invoice_number?: string | null;
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
  income_account_id?: string | null;
  terms_enabled?: boolean;
  terms_text?: string | null;
  allow_multi_day?: boolean;
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
  income_account_id?: string | null;
  terms_enabled?: boolean;
  terms_text?: string | null;
  allow_multi_day?: boolean;
}

// Backend Zod (amenity.controller.ts:43–52) requires:
//   amenity_id, member_id, unit_id (uuid)
//   booking_date (YYYY-MM-DD), start_time, end_time
//   purpose (optional, nullable, max 200)
//   guests_count (optional, non-negative int)
//
// The earlier shape used `date` + `notes`, which the backend Zod
// silently rejected with a 400 "Validation failed" — those keys
// were stripped and the required `booking_date` was missing. Names
// now match the wire contract verbatim.
interface CreateBookingInput {
  amenity_id: string;
  member_id: string;
  unit_id: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string;
  end_time: string;
  purpose?: string | null;
  guests_count?: number;
  /** AMEN-22 — the last day of a multi-day booking; the booker accepted the terms. */
  end_date?: string;
  accept_terms?: boolean;
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
  quote: (amenityId: string, request: QuoteRequest) => [...amenityKeys.all, 'quote', amenityId, request] as const,
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
      return api.get<{ data: Amenity[] }>('/amenities');
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

/**
 * AMEN-01 — what a booking would cost under the amenity's charging basis
 * (hours × rate, days × rate, the slot rate, or nothing). Amounts are
 * decimal strings. An API without the route answers 404; callers show
 * "not available yet" then.
 */
export interface AmenityQuote {
  pricing_type: 'free' | 'hourly' | 'per_slot' | 'per_day';
  rate: string;
  quantity: string;
  unit: 'hour' | 'day' | 'slot' | null;
  amount: string;
  deposit_amount: string;
  total: string;
}

const TIME_PATTERN = /^\d{2}:\d{2}$/;

/** What the quote is for: times on a day, and (AMEN-22) the last day of a multi-day booking. */
export interface QuoteRequest {
  startTime: string;
  endTime: string;
  date?: string;
  endDate?: string;
}

function quoteParams(request: QuoteRequest): Record<string, string> {
  const params: Record<string, string> = { start_time: request.startTime, end_time: request.endTime };
  if (request.date) params.date = request.date;
  if (request.endDate) params.end_date = request.endDate;
  return params;
}

function quoteReady(request: QuoteRequest): boolean {
  if (!TIME_PATTERN.test(request.startTime) || !TIME_PATTERN.test(request.endTime)) return false;
  // Several days run from the first day's start to the last day's end.
  return Boolean(request.endDate && request.date && request.endDate > request.date) || request.startTime < request.endTime;
}

export function useAmenityQuote(amenityId: string, request: QuoteRequest) {
  return useQuery({
    queryKey: amenityKeys.quote(amenityId, request),
    queryFn: function fetchQuote() {
      return api
        .get<{ data: AmenityQuote }>(`/amenities/${amenityId}/quote`, { params: quoteParams(request) })
        .then(function unwrap(res) {
          return res.data;
        });
    },
    enabled: amenityId !== '' && quoteReady(request),
    retry: false,
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

// Backend returns a structured envelope from cancelBooking so the
// admin web can show specific status (refund kicked off, invoice
// voided, etc.).
export interface CancelBookingResult {
  booking: AmenityBooking;
  refunded_payment_order_ids: string[];
  refund_failed: boolean;
  refund_skipped_reason?: 'not_paid' | 'no_invoice' | 'caller_opted_out';
  /** AMEN-02 — the invoice was cancelled with a credit note (absent on an older API). */
  invoice_cancelled?: boolean;
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function cancelBooking(input: {
      id: string;
      // Required of an admin (3–500 characters); printed on the credit note.
      reason?: string;
      // When true, a paid invoice is refunded via Razorpay and then
      // cancelled with a credit note. An unpaid invoice is always
      // cancelled; a paid one without a refund stands.
      refund?: boolean;
    }) {
      return api.post<{ data: CancelBookingResult }>(
        `/amenities/bookings/${input.id}/cancel`,
        { reason: input.reason, refund: input.refund === true },
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
      // Refund flow may have changed invoice + payment-order rows
      // outside the amenities cache — invalidate those too so the
      // admin's invoices/payments lists refresh.
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });
}

interface GenerateInvoiceResult {
  booking: AmenityBooking;
  invoice_id: string;
  invoice_number: string;
}

export function useGenerateBookingInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: function generateInvoice(input: { id: string }) {
      return api.post<{ data: GenerateInvoiceResult }>(
        `/amenities/bookings/${input.id}/generate-invoice`,
      );
    },
    onSuccess: function invalidate() {
      queryClient.invalidateQueries({ queryKey: amenityKeys.all });
    },
  });
}
