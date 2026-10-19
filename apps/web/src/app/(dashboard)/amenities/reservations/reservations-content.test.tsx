import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReservationsContent } from './reservations-content';

/**
 * Amenity & Event › Amenity Reservations (AMEN-11, screen AMEN-S6): opens
 * empty, Fetch by amenity, state ticks and dates, one count-headed panel
 * per ticked state with its rows and export strip.
 */

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/api', () => ({ api: { download: vi.fn() } }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props}>{children}</select>,
}));
vi.mock('../cancel-booking-dialog', () => ({
  CancelBookingDialog: ({ booking }: { booking: { id: string } | null }) => (booking ? <div role="dialog">Cancel {booking.id}</div> : null),
}));
vi.mock('@/hooks', () => ({
  useAmenities: () => ({ data: { data: [{ id: 'am-1', name: 'Party Hall' }, { id: 'am-2', name: 'Gym' }] } }),
}));

const calls = vi.hoisted(() => ({ list: [] as Array<{ filters: Record<string, string>; enabled: boolean }> }));

function booking(id: string, status: string, extra: Record<string, unknown> = {}) {
  return {
    id, status, amenity_name: 'Party Hall', booking_date: '2030-03-09', start_time: '10:00:00', end_time: '12:00:00',
    block: 'A', unit_number: '101', member_name: 'Test Resident', total_amount: 1000, deposit_amount: 0,
    invoice_id: null, invoice_number: null, ...extra,
  };
}

const ROWS: Record<string, unknown[]> = {
  confirmed: [
    booking('b-1', 'confirmed', { invoice_id: 'inv-1', invoice_number: 'INV-7', invoice_total: '1500.00', invoice_paid: '500.00' }),
    booking('b-2', 'confirmed'),
  ],
  cancelled: [booking('b-3', 'cancelled')],
};

vi.mock('@/hooks/use-amenity-reservations', () => ({
  reservationParams: (filters: { status: string; amenityId: string; dateFrom: string; dateTo: string }) => ({
    status: filters.status,
    ...(filters.amenityId ? { amenity_id: filters.amenityId } : {}),
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
  }),
  useAmenityReservations: (filters: Record<string, string>, _page: number, _limit: number, enabled = true) => {
    calls.list.push({ filters, enabled });
    const rows = ROWS[filters.status] ?? [];
    return { isLoading: false, data: { data: rows, total: rows.length, counts: { confirmed: 2, cancelled: 1 } } };
  },
}));

function fetchWith(options: { from: string; to: string; cancelled?: boolean; amenity?: string }): void {
  fireEvent.change(screen.getByLabelText('Date from'), { target: { value: options.from } });
  fireEvent.change(screen.getByLabelText('Date to'), { target: { value: options.to } });
  if (options.amenity) fireEvent.change(screen.getByLabelText('Amenity'), { target: { value: options.amenity } });
  if (options.cancelled) fireEvent.click(screen.getByRole('checkbox', { name: 'Cancelled' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));
}

describe('ReservationsContent', () => {
  beforeEach(() => {
    calls.list = [];
  });

  it('opens empty and asks for nothing until Fetch', () => {
    render(<ReservationsContent />);

    expect(screen.getByText('Choose filters and press Fetch.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    expect(calls.list.every((call) => !call.enabled)).toBe(true);
  });

  it('shows a Confirmed and a Cancelled panel with their counts for March', async () => {
    render(<ReservationsContent />);

    await act(async () => fetchWith({ from: '2030-03-01', to: '2030-03-31', cancelled: true, amenity: 'am-1' }));

    expect(screen.getByRole('heading', { name: '2 Reservations Confirmed' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '1 Reservations Cancelled' })).toBeTruthy();
    expect(within(screen.getByRole('table', { name: 'Reservations Confirmed' })).getAllByRole('row')).toHaveLength(3);
    const asked = calls.list.filter((call) => call.enabled).map((call) => call.filters);
    expect(asked).toContainEqual({ amenityId: 'am-1', status: 'cancelled', dateFrom: '2030-03-01', dateTo: '2030-03-31' });
  });

  it('shows the invoice, what is paid, and Cancel only on confirmed rows', async () => {
    render(<ReservationsContent />);

    await act(async () => fetchWith({ from: '2030-03-01', to: '2030-03-31', cancelled: true }));

    const confirmed = within(screen.getByRole('table', { name: 'Reservations Confirmed' })).getAllByRole('row');
    expect(confirmed[1].textContent).toContain('INV-7');
    expect(confirmed[1].textContent).toContain('1,500');
    expect(confirmed[1].textContent).toContain('500');
    expect(within(screen.getByRole('table', { name: 'Reservations Cancelled' })).queryByRole('button', { name: 'Cancel' })).toBeNull();
    fireEvent.click(within(screen.getByRole('table', { name: 'Reservations Confirmed' })).getAllByRole('button', { name: 'Cancel' })[0]);
    expect(screen.getByRole('dialog').textContent).toBe('Cancel b-1');
  });

  it('asks to tick a state when none is ticked', async () => {
    render(<ReservationsContent />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Confirmed' }));

    await act(async () => fetchWith({ from: '2030-03-01', to: '2030-03-31' }));

    expect(screen.getByText('Tick at least one state and press Fetch.')).toBeTruthy();
  });
});
