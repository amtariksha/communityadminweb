import { describe, expect, it } from 'vitest';
import type { Amenity } from '@/hooks';
import { bookingInput, validateBookingForm } from './booking-form';
import { emptyBookingForm } from './booking-fields';

/** AMEN-22 — the Reserve form: the amenity's terms must be accepted; several days for a multi-day amenity. */
const ROOM = { id: 'am-1', name: 'Guest Room', pricing_type: 'per_day', allow_multi_day: true, terms_enabled: true } as Amenity;
const filled = { ...emptyBookingForm('2031-03-01'), amenityId: 'am-1', unitId: 'u-1', memberId: 'm-1' };

describe('Reserve Amenity', () => {
  it('asks for the terms to be accepted when the amenity has them', () => {
    expect(validateBookingForm(filled, ROOM)).toMatch(/terms/);
    expect(validateBookingForm({ ...filled, acceptTerms: true }, ROOM)).toBeNull();
    expect(validateBookingForm(filled, { ...ROOM, terms_enabled: false })).toBeNull();
  });

  it('takes a booking over several days, end time before start time included', () => {
    const several = { ...filled, acceptTerms: true, endDate: '2031-03-03', startTime: '12:00', endTime: '10:00' };
    expect(validateBookingForm(several, ROOM)).toBeNull();
    expect(bookingInput(several, ROOM)).toMatchObject({ booking_date: '2031-03-01', end_date: '2031-03-03', accept_terms: true });
    expect(validateBookingForm({ ...several, endDate: '2031-02-28' }, ROOM)).toMatch(/End date/);
  });

  it('sends neither field for an amenity without them (older APIs never see them)', () => {
    const input = bookingInput(filled, { ...ROOM, allow_multi_day: false, terms_enabled: false });
    expect(input).not.toHaveProperty('end_date');
    expect(input).not.toHaveProperty('accept_terms');
  });
});
