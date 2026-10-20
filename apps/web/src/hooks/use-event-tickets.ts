'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { eventKeys } from './use-events';

/**
 * AMEN-43 — ticketed events: an event's ticket types (Setup › Event) and
 * Event › Members Attending. An API from before them answers 404; the
 * screens then say "not available yet".
 */

export interface EventTicketType {
  id: string;
  event_id: string;
  slot_label: string;
  /** Decimal strings. */
  member_price: string;
  guest_price: string;
  capacity: number | null;
  is_active: boolean;
  display_order: number | null;
  /** Tickets of both kinds held by live purchases. */
  sold: number;
}

export interface EventTicketTypeRowInput {
  id?: string;
  slot_label: string;
  member_price: number;
  guest_price: number;
  capacity: number | null;
  is_active: boolean;
}

export interface EventAttendee {
  id: string;
  member_id: string;
  name: string | null;
  block: string | null;
  unit_number: string | null;
  slot_label: string | null;
  member_tickets: number;
  guest_tickets: number;
  amount: string;
  paid: string | null;
  remaining: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: string | null;
  receipt_numbers: string | null;
  contact_no: string | null;
  email: string | null;
  status: string;
  tickets_cancelled_at: string | null;
}

const ticketKeys = {
  types: (eventId: string) => [...eventKeys.detail(eventId), 'ticket-types'] as const,
  attendees: (eventId: string) => [...eventKeys.detail(eventId), 'attendees'] as const,
};

export function useEventTicketTypes(eventId: string) {
  return useQuery({
    queryKey: ticketKeys.types(eventId),
    queryFn: () => api.get<{ data: EventTicketType[] }>(`/events/${eventId}/ticket-types/all`).then((res) => res.data),
    enabled: eventId !== '',
    retry: false,
  });
}

export function useSaveEventTicketTypes(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: EventTicketTypeRowInput[]) =>
      api.put<{ data: EventTicketType[] }>(`/events/${eventId}/ticket-types`, { rows }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: ticketKeys.attendees(eventId),
    queryFn: () => api.get<{ data: EventAttendee[] }>(`/events/${eventId}/attendees`).then((res) => res.data),
    enabled: eventId !== '',
    retry: false,
  });
}

export interface CancelTicketsResult {
  invoice_cancelled: boolean;
  refunded_payment_order_ids: string[];
  refund_skipped_reason?: string;
}

export function useCancelEventTickets(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { purchaseId: string; reason: string; refund: boolean }) =>
      api
        .post<{ data: CancelTicketsResult }>(`/events/${eventId}/tickets/${input.purchaseId}/cancel`, {
          reason: input.reason,
          refund: input.refund,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
