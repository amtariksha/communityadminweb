import { Suspense, type ReactNode } from 'react';
import { BookingsCalendar } from './bookings-calendar';

// Amenity & Event › Amenity › Reservations Calendar (classic, AMEN-10, screen AMEN-S7).
// Suspense: the calendar reads ?new=1 (useSearchParams).
export default function Page(): ReactNode {
  return (
    <Suspense fallback={null}>
      <div className="space-y-6">
        <BookingsCalendar classic />
      </div>
    </Suspense>
  );
}
