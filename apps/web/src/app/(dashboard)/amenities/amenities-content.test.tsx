import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AmenitiesContent from './amenities-content';

/** DASH-07 — `/amenities?new=1` opens the New Booking form (Book Facilities) on load. */

const nav = vi.hoisted(() => ({ search: '', replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => '/amenities',
  useRouter: () => ({ replace: nav.replace }),
}));

vi.mock('@/hooks', () => {
  const mutation = () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false });
  const list = () => ({ data: { data: [], total: 0 }, isLoading: false });
  return {
    useAmenities: list,
    useAmenityBookings: list,
    useUnits: list,
    useUnitMembers: () => ({ data: [], isLoading: false }),
    useCreateAmenity: mutation,
    useUpdateAmenity: mutation,
    useCancelBooking: mutation,
    useCreateBooking: mutation,
    useGenerateBookingInvoice: mutation,
  };
});

vi.mock('@/components/ui/toast', () => ({ useToast: () => ({ addToast: vi.fn() }) }));

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
