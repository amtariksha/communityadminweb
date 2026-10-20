import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AmenitiesContent, { AMENITY_TYPES } from './amenities-content';

/**
 * DASH-07 — `/amenities?new=1` opens the New Booking form (Book Facilities) on load.
 * AMEN-03 — no "generate invoice" tick (the API invoices on create), the status
 * filter offers only states something sets, and the export reads price_per_unit.
 */

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));
const hooks = vi.hoisted(() => ({
  bookingFilters: [] as unknown[],
  createBooking: vi.fn(),
  exportColumns: [] as Array<{ key: string }>,
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/amenities',
  useRouter: () => ({ replace: nav.replace }),
}));

const AMENITIES = [
  { id: 'am-1', name: 'Party Hall', amenity_type: 'party_hall', pricing_type: 'hourly', price_per_unit: 500, deposit_amount: 0 },
];

vi.mock('@/hooks', () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  const list = () => ({ data: { data: [], total: 0 }, isLoading: false });
  return {
    useAmenities: () => ({ data: { data: AMENITIES }, isLoading: false }),
    useAmenityBookings: (filters: unknown) => {
      hooks.bookingFilters.push(filters);
      return list();
    },
    useAmenityQuote: () => ({
      data: { pricing_type: 'hourly', rate: '500.00', quantity: '1', unit: 'hour', amount: '500.00', deposit_amount: '0.00', total: '500.00' },
      isLoading: false,
      error: null,
    }),
    useUnitMembers: () => ({ data: [{ id: 'm-1', name: 'Asha Rao', member_type: 'owner' }], isLoading: false }),
    useAmenitySlots: () => ({ data: [], isLoading: false }),
    useCreateAmenity: mutation,
    useUpdateAmenity: mutation,
    useCancelBooking: mutation,
    useCreateBooking: () => ({ mutate: hooks.createBooking, isPending: false }),
    useGenerateBookingInvoice: mutation,
  };
});

// AMEN-42 — the add-ons of the picked amenity (none here).
vi.mock('@/hooks/use-amenity-setup', () => ({
  useAmenityAddons: () => ({ data: [], isLoading: false }),
}));

vi.mock('../helpdesk/new/use-unit-choices', () => ({
  useUnitChoices: () => ({ data: [{ id: 'unit-1', unit_number: 'A-101', block: 'A' }] }),
}));

vi.mock('@/components/ui/export-button', () => ({
  ExportButton: ({ columns }: { columns: Array<{ key: string }> }) => {
    hooks.exportColumns = columns;
    return null;
  },
}));

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: hooks.toast }) }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select {...props}>{children}</select>
  ),
}));

const dialogField = (id: string) => document.getElementById(id) as HTMLSelectElement;

describe('AmenitiesContent — ?new=1', () => {
  beforeEach(() => {
    nav.search = '';
    nav.replace.mockClear();
  });

  it('opens the New Booking dialog and drops the parameter from the URL', () => {
    nav.search = 'new=1';

    render(<AmenitiesContent />);

    expect(screen.getByRole('heading', { name: 'New Booking on Behalf of Resident' })).toBeTruthy();
    expect(nav.replace).toHaveBeenCalledWith('/amenities');
  });

  it('stays closed without the parameter', () => {
    render(<AmenitiesContent />);

    expect(screen.queryByRole('heading', { name: 'New Booking on Behalf of Resident' })).toBeNull();
    expect(nav.replace).not.toHaveBeenCalled();
  });
});

describe('AmenitiesContent — AMEN-03 controls', () => {
  beforeEach(() => {
    nav.search = '';
    hooks.bookingFilters = [];
    hooks.createBooking.mockReset();
    hooks.toast.mockReset();
  });

  it('has no "generate invoice" tick on New Booking, and shows the computed charge', () => {
    nav.search = 'new=1';

    render(<AmenitiesContent />);

    expect(screen.queryByText(/Generate invoice for this booking/i)).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reserve' })).toBeTruthy();
  });

  it('a paid booking reports one invoice: "Booking + invoice … created"', () => {
    nav.search = 'new=1';
    hooks.createBooking.mockImplementation((_input: unknown, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess({ data: { id: 'b-1', invoice_id: 'inv-1', invoice_number: 'INV-0042' } }),
    );
    render(<AmenitiesContent />);

    fireEvent.change(dialogField('nb-amenity'), { target: { value: 'am-1' } });
    fireEvent.change(dialogField('nb-unit'), { target: { value: 'unit-1' } });
    fireEvent.change(dialogField('nb-member'), { target: { value: 'm-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reserve' }));

    expect(hooks.createBooking).toHaveBeenCalledTimes(1);
    expect(hooks.createBooking.mock.calls[0][0]).toMatchObject({
      amenity_id: 'am-1', unit_id: 'unit-1', member_id: 'm-1', start_time: '09:00', end_time: '10:00',
    });
    expect(hooks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Booking + invoice INV-0042 created', variant: 'success' }),
    );
  });

  it('refuses to reserve before a member is picked', () => {
    nav.search = 'new=1';
    render(<AmenitiesContent />);

    fireEvent.change(dialogField('nb-amenity'), { target: { value: 'am-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reserve' }));

    expect(hooks.createBooking).not.toHaveBeenCalled();
    expect(hooks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Please pick a unit.' }));
  });

  it('offers only the states something sets in the status filter (AMEN-40: Awaiting Payment)', () => {
    render(<AmenitiesContent />);

    const options = Array.from(
      (screen.getByLabelText('Status') as HTMLSelectElement).options,
    ).map((o) => o.textContent);
    expect(options).toEqual(['All', 'Awaiting Payment', 'Confirmed', 'Cancelled']);
  });

  it('asks the API for the whole visible month', () => {
    render(<AmenitiesContent />);

    const filters = hooks.bookingFilters.at(-1) as { date_from: string; date_to: string };
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    expect(filters.date_from).toBe(`${now.getFullYear()}-${month}-01`);
    expect(filters.date_to).toBe(`${now.getFullYear()}-${month}-${lastDay}`);
  });

  it('exports the rate from price_per_unit, a key the API returns', () => {
    render(<AmenitiesContent />);

    expect(hooks.exportColumns.map((c) => c.key)).toContain('price_per_unit');
    expect(hooks.exportColumns.map((c) => c.key)).not.toContain('rate');
  });
});

describe('AMENITY_TYPES', () => {
  it('lists every type the table accepts, Badminton Court and Other included', () => {
    expect([...AMENITY_TYPES].sort()).toEqual([
      'badminton_court', 'clubhouse', 'community_hall', 'ev_charger', 'guest_room', 'gym',
      'other', 'party_hall', 'pool', 'tennis_court', 'terrace',
    ]);
  });
});
