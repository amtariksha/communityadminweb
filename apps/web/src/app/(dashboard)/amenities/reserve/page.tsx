'use client';

import { useRouter } from 'next/navigation';
import { useMemo, type ReactNode } from 'react';
import { useAmenities } from '@/hooks';
import { toDateKey } from '../calendar/calendar-dates';
import { BookingForm } from '../components/booking-form';

const CALENDAR = '/amenities/calendar';

// Amenity & Event › Reserve Amenity (classic, AMEN-10, screen AMEN-S8 as a page):
// the button on every page of the module opens it.
export default function Page(): ReactNode {
  const router = useRouter();
  const amenities = (useAmenities().data?.data ?? []).filter((amenity) => amenity.is_active);
  const today = useMemo(() => toDateKey(new Date()), []);
  return (
    <BookingForm mode="page" amenities={amenities} defaultDate={today} onClose={() => router.push(CALENDAR)} onSaved={() => router.push(CALENDAR)} />
  );
}
