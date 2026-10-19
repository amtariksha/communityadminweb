import type { AmenityBooking } from '@/hooks';

/** Amenity types, charging bases and booking states, and how screens name them. */

// Every type the table accepts (migration 026). Badminton Court and Other
// were missing, so an amenity of either type opened in Edit with no type
// selected.
export const AMENITY_TYPES = [
  'clubhouse',
  'party_hall',
  'guest_room',
  'gym',
  'pool',
  'tennis_court',
  'badminton_court',
  'community_hall',
  'terrace',
  'ev_charger',
  'other',
] as const;

export const PRICING_TYPES = ['free', 'hourly', 'per_slot', 'per_day'] as const;

// Only these two are ever set (AMEN-03); Completed / No Show were offered and never matched.
export const BOOKING_STATUSES = ['confirmed', 'cancelled'] as const;

const TYPE_ICONS: Record<string, string> = {
  clubhouse: '\u{1F3E0}',
  party_hall: '\u{1F389}',
  guest_room: '\u{1F6CF}️',
  gym: '\u{1F4AA}',
  pool: '\u{1F3CA}',
  tennis_court: '\u{1F3BE}',
  community_hall: '\u{1F3DB}️',
  terrace: '\u{1F307}',
  ev_charger: '⚡',
};

export function amenityTypeIcon(type: string): string {
  return TYPE_ICONS[type] ?? '\u{1F3E2}';
}

function words(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export const formatAmenityType = words;
export const formatPricingType = words;
export const formatBookingStatus = words;

export function bookingStatusVariant(status: string): 'success' | 'destructive' | 'secondary' | 'warning' {
  if (status === 'confirmed') return 'success';
  if (status === 'cancelled') return 'destructive';
  if (status === 'no_show') return 'warning';
  return 'secondary';
}

/** A booking can be invoiced when its charge or its deposit is above zero. */
export function bookingBillable(booking: AmenityBooking): boolean {
  return Number(booking.total_amount ?? 0) + Number(booking.deposit_amount ?? 0) > 0;
}
