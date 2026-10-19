'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useToast } from '@/components/ui/toast';
import { useAmenities, useAmenityBookings, useGenerateBookingInvoice, type Amenity, type AmenityBooking } from '@/hooks';
import { useOpenOnNewParam } from '@/hooks/use-open-on-new-param';
import { friendlyError } from '@/lib/api-error';
import { useAdminLayout } from '@/lib/layout-context';
import { CancelBookingDialog } from '../cancel-booking-dialog';
import { NewBookingDialog } from '../components/booking-form';
import { AmenityChecks, StandardCalendarFilters } from './calendar-filters';
import { buildCalendarDays, monthRange, toDateKey } from './calendar-dates';
import { CalendarGrid } from './calendar-grid';
import { DayPanel } from './day-panel';
import { useCalendarMonth } from './use-calendar-month';

// The Reserve Amenity page of the classic layout (AMEN-10).
export const RESERVE_PAGE = '/amenities/reserve';

function groupByDate(bookings: readonly AmenityBooking[]): Map<string, AmenityBooking[]> {
  const map = new Map<string, AmenityBooking[]>();
  for (const booking of bookings) {
    const key = booking.booking_date.slice(0, 10);
    map.set(key, [...(map.get(key) ?? []), booking]);
  }
  return map;
}

function useAmenityFilter(classic: boolean) {
  const [amenityId, setAmenityId] = useState('');
  const [status, setStatus] = useState('');
  // Classic: amenities unticked on the multi-select (all ticked by default).
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toggle = (id: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const apiFilter = classic ? {} : { amenity_id: amenityId || undefined, status: status || undefined };
  return { amenityId, setAmenityId, status, setStatus, hidden, toggle, showAll: () => setHidden(new Set()), apiFilter };
}

function useInvoiceAction() {
  const { addToast } = useToast();
  const generate = useGenerateBookingInvoice();
  const run = (booking: AmenityBooking) =>
    generate.mutate(
      { id: booking.id },
      {
        onSuccess: (res) => addToast({ title: `Invoice ${res.data.invoice_number} generated`, variant: 'success' }),
        onError: (error) => addToast({ title: 'Failed to generate invoice', description: friendlyError(error), variant: 'destructive' }),
      },
    );
  return { run, generatingId: generate.isPending ? generate.variables?.id ?? null : null };
}

/**
 * The reservations calendar: a month of bookings with the picked day's
 * list beside it. Standard: the Bookings tab of /amenities, with its
 * filters and New Booking. Classic (AMEN-S7): Reservations Calendar, an
 * amenity multi-select, and Reserve Amenity in the module frame.
 */
export function BookingsCalendar({ classic = false }: { classic?: boolean }): ReactNode {
  const layout = useAdminLayout();
  const cal = useCalendarMonth();
  const filter = useAmenityFilter(classic);
  const invoice = useInvoiceAction();
  const [cancelTarget, setCancelTarget] = useState<AmenityBooking | null>(null);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  // The dashboard's "Book Facilities" links to /amenities?new=1; classic opens the Reserve page.
  useOpenOnNewParam(() => setNewBookingOpen(true), layout === 'classic' ? RESERVE_PAGE : undefined);

  const amenities: Amenity[] = useAmenities().data?.data ?? [];
  const bookingsQuery = useAmenityBookings({ ...filter.apiFilter, ...monthRange(cal.year, cal.month), limit: 500 });
  const bookings = useMemo(
    () => (bookingsQuery.data?.data ?? []).filter((booking) => !filter.hidden.has(booking.amenity_id)),
    [bookingsQuery.data, filter.hidden],
  );
  const amenityById = useMemo(() => new Map(amenities.map((amenity) => [amenity.id, amenity])), [amenities]);
  const bookingsByDate = useMemo(() => groupByDate(bookings), [bookings]);
  const days = useMemo(() => buildCalendarDays(cal.year, cal.month), [cal.year, cal.month]);
  const dayBookings = cal.selectedDate ? bookingsByDate.get(toDateKey(cal.selectedDate)) ?? [] : [];

  return (
    <>
      {classic ? (
        <AmenityChecks amenities={amenities} hidden={filter.hidden} onToggle={filter.toggle} onAll={filter.showAll} />
      ) : (
        <StandardCalendarFilters
          amenities={amenities}
          amenityId={filter.amenityId}
          status={filter.status}
          onAmenity={filter.setAmenityId}
          onStatus={filter.setStatus}
          onNewBooking={() => setNewBookingOpen(true)}
        />
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CalendarGrid
          year={cal.year}
          month={cal.month}
          days={days}
          today={cal.today}
          selectedDate={cal.selectedDate}
          bookingsByDate={bookingsByDate}
          amenityById={amenityById}
          loading={bookingsQuery.isLoading}
          onSelect={cal.setSelectedDate}
          onPrev={cal.prev}
          onNext={cal.next}
          onToday={cal.goToToday}
        />
        <DayPanel
          selectedDate={cal.selectedDate}
          bookings={dayBookings}
          amenityById={amenityById}
          generatingId={invoice.generatingId}
          onGenerateInvoice={invoice.run}
          onCancel={setCancelTarget}
        />
      </div>
      <CancelBookingDialog booking={cancelTarget} onClose={() => setCancelTarget(null)} />
      {!classic && (
        <NewBookingDialog open={newBookingOpen} onOpenChange={setNewBookingOpen} amenities={amenities} defaultDate={toDateKey(cal.selectedDate ?? cal.today)} />
      )}
    </>
  );
}
