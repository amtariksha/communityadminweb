import type { CreateEventInput, EventItem } from '@/hooks';
import { todayIST } from '@/lib/date';

/** The fields of the event form (AMEN-S4, today's set plus the cover image) and what is sent. */

export type EventAudience = NonNullable<CreateEventInput['target_audience']>;
export type EventStatus = NonNullable<CreateEventInput['status']>;

export interface EventFormValues {
  title: string;
  coverImageUrl: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  capacity: string;
  audience: EventAudience;
  status: EventStatus;
  description: string;
  /** AMEN-23 — the amenity it is held in ('' = the venue written out), class type, last day. */
  amenityId: string;
  classType: EventClassType;
  endDate: string;
  /** AMEN-43 — the account ticket invoices credit ('' = the facility's, else Other Income). */
  incomeAccountId: string;
}

export type EventClassType = 'regular' | 'one_time';

export const CLASS_TYPE_OPTIONS: ReadonlyArray<{ value: EventClassType; label: string }> = [
  { value: 'regular', label: 'Regular Class' },
  { value: 'one_time', label: 'One-Time Class' },
];

export const AUDIENCE_OPTIONS: ReadonlyArray<{ value: EventAudience; label: string }> = [
  { value: 'all', label: 'All Society Residents' },
  { value: 'tower', label: 'Tower Specific' },
  { value: 'floor', label: 'Floor Specific' },
  { value: 'members_only', label: 'Owners Only' },
];

export const STATUS_OPTIONS: ReadonlyArray<{ value: EventStatus; label: string }> = [
  { value: 'published', label: 'Published (Visible in Resident App)' },
  { value: 'draft', label: 'Draft (Admin Only)' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const hhmm = (value: string): string => value.slice(0, 5);

export function eventFormValues(event?: EventItem | null, today = todayIST()): EventFormValues {
  if (!event) {
    return {
      title: '', coverImageUrl: '', eventDate: today, startTime: '18:00', endTime: '20:00',
      location: 'Community Clubhouse', capacity: '', audience: 'all', status: 'published', description: '',
      amenityId: '', classType: 'one_time', endDate: '', incomeAccountId: '',
    };
  }
  return {
    title: event.title,
    coverImageUrl: event.cover_image_url ?? '',
    eventDate: event.event_date.slice(0, 10),
    startTime: hhmm(event.start_time),
    endTime: hhmm(event.end_time),
    location: event.location ?? '',
    capacity: event.max_attendees !== null ? String(event.max_attendees) : '',
    audience: event.target_audience,
    status: event.status,
    description: event.description ?? '',
    amenityId: event.amenity_id ?? '',
    classType: event.class_type ?? 'one_time',
    endDate: event.end_date && event.end_date !== event.event_date ? event.end_date.slice(0, 10) : '',
    incomeAccountId: event.income_account_id ?? '',
  };
}

/** The payload, or the first thing to fix (the API's limits: name 2–255, description ≤ 3,000). */
export function eventPayload(values: EventFormValues): { payload?: CreateEventInput; error?: string } {
  const title = values.title.trim();
  if (title.length < 2) return { error: 'Event Name needs at least 2 characters' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.eventDate)) return { error: 'Pick the event date' };
  if (!values.startTime || !values.endTime) return { error: 'Give a start and an end time' };
  if (values.endTime <= values.startTime) return { error: 'The end time must be after the start time' };
  const capacity = values.capacity.trim() === '' ? null : Number(values.capacity);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) return { error: 'Capacity must be a whole number above 0' };
  if (values.description.length > 3000) return { error: 'Description is at most 3,000 characters' };
  if (!values.amenityId && !values.location.trim()) return { error: 'Pick the facility, or write the venue' };
  const regular = values.classType === 'regular';
  if (regular && values.endDate && values.endDate < values.eventDate) return { error: 'The end date must be on or after the start date' };
  return {
    payload: {
      title,
      description: values.description.trim() || null,
      event_date: values.eventDate,
      start_time: values.startTime,
      end_time: values.endTime,
      location: values.amenityId ? null : values.location.trim() || null,
      // AMEN-23 — held in an amenity (its hours are taken from bookings); a Regular class runs to its end date.
      amenity_id: values.amenityId || null,
      class_type: values.classType,
      end_date: regular && values.endDate ? values.endDate : null,
      income_account_id: values.incomeAccountId || null,
      max_attendees: capacity,
      cover_image_url: values.coverImageUrl || null,
      target_audience: values.audience,
      status: values.status,
    },
  };
}
